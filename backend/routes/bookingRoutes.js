
const express = require("express");
const router = express.Router();
const db = require("../db");

// Promise-based database pool
const promiseDb = db.promise();

// =====================================================
// BOOK A TUTOR
// POST /api/bookings
// =====================================================

router.post("/", async (req, res) => {
    const {
        request_id,
        student_id,
        tutor_id,
        slot_id
    } = req.body;

    // -----------------------------------------
    // 1. Validate request
    // -----------------------------------------

    if (
        !request_id ||
        !student_id ||
        !tutor_id ||
        !slot_id
    ) {
        return res.status(400).json({
            success: false,
            error:
                "request_id, student_id, tutor_id and slot_id are required"
        });
    }

    let connection = null;
    let transactionStarted = false;

    try {
        // -----------------------------------------
        // 2. Get connection and start transaction
        // -----------------------------------------

        connection = await promiseDb.getConnection();

        await connection.beginTransaction();
        transactionStarted = true;

        // -----------------------------------------
        // 3. Check coaching request
        // -----------------------------------------

        const [requestResults] = await connection.query(
            `
            SELECT
                request_id,
                student_id,
                status
            FROM Coaching_Request
            WHERE request_id = ?
            FOR UPDATE
            `,
            [request_id]
        );

        if (requestResults.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                error: "Coaching request not found"
            });
        }

        const request = requestResults[0];

        // Verify student ownership
        if (
            Number(request.student_id) !==
            Number(student_id)
        ) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(403).json({
                success: false,
                error: "This request does not belong to the student"
            });
        }

        // -----------------------------------------
        // 4. Check selected tutor slot
        // -----------------------------------------

        const [slotResults] = await connection.query(
            `
            SELECT
                slot_id,
                tutor_id,
                start_time,
                end_time,
                status
            FROM Availability_Slot
            WHERE slot_id = ?
              AND tutor_id = ?
            FOR UPDATE
            `,
            [slot_id, tutor_id]
        );

        if (slotResults.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                error: "Selected tutor slot not found"
            });
        }

        const slot = slotResults[0];

        // Check slot availability
        if (
            String(slot.status).toUpperCase() !==
            "AVAILABLE"
        ) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                error: "This slot is no longer available"
            });
        }

        // -----------------------------------------
        // 5. Check duplicate booking
        // -----------------------------------------

        const [existingBookings] = await connection.query(
            `
            SELECT
                booking_id,
                booking_status
            FROM Booking
            WHERE request_id = ?
              AND student_id = ?
            `,
            [request_id, student_id]
        );

        if (existingBookings.length > 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                error: "A booking already exists for this request",
                booking_id: existingBookings[0].booking_id,
                booking_status:
                    existingBookings[0].booking_status
            });
        }

        // -----------------------------------------
        // 6. Create booking
        // -----------------------------------------
        // Payment is required before confirmation.

        const [bookingResult] = await connection.query(
            `
            INSERT INTO Booking
            (
                request_id,
                student_id,
                tutor_id,
                slot_id,
                booking_status
            )
            VALUES (?, ?, ?, ?, 'PAYMENT_PENDING')
            `,
            [
                request_id,
                student_id,
                tutor_id,
                slot_id
            ]
        );

        const bookingId = bookingResult.insertId;

        // -----------------------------------------
        // 7. Mark slot as booked
        // -----------------------------------------

        const [slotUpdateResult] = await connection.query(
            `
            UPDATE Availability_Slot
            SET status = 'BOOKED'
            WHERE slot_id = ?
              AND tutor_id = ?
              AND status = 'AVAILABLE'
            `,
            [
                slot_id,
                tutor_id
            ]
        );

        if (slotUpdateResult.affectedRows === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                error: "Unable to reserve the selected slot"
            });
        }

        // -----------------------------------------
        // 8. Update coaching request
        // -----------------------------------------

        await connection.query(
            `
            UPDATE Coaching_Request
            SET status = 'ACCEPTED'
            WHERE request_id = ?
            `,
            [request_id]
        );

        // -----------------------------------------
        // 9. Commit transaction
        // -----------------------------------------

        await connection.commit();
        transactionStarted = false;

        // -----------------------------------------
        // 10. Notify student and tutor
        // -----------------------------------------

        const io = req.app.get("io");
        const studentSockets = req.app.get("studentSockets");
        const tutorSockets = req.app.get("tutorSockets");

        const notification = {
            booking_id: Number(bookingId),
            request_id: Number(request_id),
            student_id: Number(student_id),
            tutor_id: Number(tutor_id),
            slot_id: Number(slot_id),
            booking_status: "PAYMENT_PENDING",
            status: "PAYMENT_PENDING",
            start_time: slot.start_time,
            end_time: slot.end_time,
            message:
                "Booking created. Please complete demo payment."
        };

        const studentSocketId = studentSockets
            ? studentSockets.get(Number(student_id))
            : null;

        const tutorSocketId = tutorSockets
            ? tutorSockets.get(Number(tutor_id))
            : null;

        if (io && studentSocketId) {
            io.to(studentSocketId).emit(
                "bookingCreated",
                notification
            );
        }

        if (io && tutorSocketId) {
            io.to(tutorSocketId).emit(
                "bookingCreated",
                notification
            );
        }

        // -----------------------------------------
        // 11. Send response
        // -----------------------------------------

        return res.status(201).json({
            success: true,
            message:
                "Tutor booking created. Complete demo payment.",
            booking_id: Number(bookingId),
            request_id: Number(request_id),
            student_id: Number(student_id),
            tutor_id: Number(tutor_id),
            slot_id: Number(slot_id),
            booking_status: "PAYMENT_PENDING",
            slot_status: "BOOKED",
            payment_required: true
        });

    } catch (error) {
        console.error("BOOKING ERROR:", error);

        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "ROLLBACK ERROR:",
                    rollbackError.message
                );
            }
        }

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                error: "Failed to create booking",
                details: error.message
            });
        }

    } finally {
        if (
            connection &&
            typeof connection.release === "function"
        ) {
            connection.release();
        }
    }
});

// =====================================================
// GET BOOKING BY ID
// GET /api/bookings/:bookingId
// =====================================================

router.get("/:bookingId", async (req, res) => {
    const bookingId = req.params.bookingId;

    try {
        const [results] = await promiseDb.query(
            `
            SELECT
                b.*,
                t.name AS tutor_name,
                t.price_per_session,
                s.name AS student_name
            FROM Booking b
            LEFT JOIN Tutor t
                ON b.tutor_id = t.tutor_id
            LEFT JOIN Student s
                ON b.student_id = s.student_id
            WHERE b.booking_id = ?
            `,
            [bookingId]
        );

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Booking not found"
            });
        }

        return res.status(200).json({
            success: true,
            booking: results[0]
        });

    } catch (error) {
        console.error("GET BOOKING ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch booking",
            details: error.message
        });
    }
});

// =====================================================
// GET STUDENT BOOKINGS
// GET /api/bookings/student/:studentId
// =====================================================

router.get("/student/:studentId", async (req, res) => {
    const studentId = req.params.studentId;

    try {
        const [results] = await promiseDb.query(
            `
            SELECT
                b.*,
                t.name AS tutor_name,
                t.price_per_session,
                av.start_time,
                av.end_time
            FROM Booking b
            LEFT JOIN Tutor t
                ON b.tutor_id = t.tutor_id
            LEFT JOIN Availability_Slot av
                ON b.slot_id = av.slot_id
            WHERE b.student_id = ?
            ORDER BY b.booking_id DESC
            `,
            [studentId]
        );

        return res.status(200).json({
            success: true,
            bookings: results
        });

    } catch (error) {
        console.error("GET STUDENT BOOKINGS ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch student bookings",
            details: error.message
        });
    }
});

// =====================================================
// GET TUTOR BOOKINGS
// GET /api/bookings/tutor/:tutorId
// =====================================================

router.get("/tutor/:tutorId", async (req, res) => {
    const tutorId = req.params.tutorId;

    try {
        const [results] = await promiseDb.query(
            `
            SELECT
                b.*,
                s.name AS student_name,
                av.start_time,
                av.end_time
            FROM Booking b
            LEFT JOIN Student s
                ON b.student_id = s.student_id
            LEFT JOIN Availability_Slot av
                ON b.slot_id = av.slot_id
            WHERE b.tutor_id = ?
            ORDER BY b.booking_id DESC
            `,
            [tutorId]
        );

        return res.status(200).json({
            success: true,
            bookings: results
        });

    } catch (error) {
        console.error("GET TUTOR BOOKINGS ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to fetch tutor bookings",
            details: error.message
        });
    }
});

module.exports = router;