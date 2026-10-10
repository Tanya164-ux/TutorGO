
const express = require("express");
const router = express.Router();
const db = require("../db");

// POST /api/payments/mock
// Demo payment only — no real money is processed.
router.post("/mock", async (req, res) => {
    const {
        booking_id,
        student_id,
        payment_method,
        payment_reference
    } = req.body;

    // -----------------------------------------
    // 1. Validate request
    // -----------------------------------------

    if (
        !booking_id ||
        !student_id ||
        !payment_method ||
        !payment_reference
    ) {
        return res.status(400).json({
            success: false,
            message: "All payment fields are required"
        });
    }

    const allowedMethods = [
        "UPI",
        "CARD",
        "CASH",
        "DEMO"
    ];

    if (!allowedMethods.includes(payment_method)) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment method"
        });
    }

    if (
        typeof payment_reference !== "string" ||
        payment_reference.trim().length < 3
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid payment reference"
        });
    }

    let connection = null;
    let shouldReleaseConnection = false;
    let transactionStarted = false;

    try {
        // -----------------------------------------
        // 2. Get promise-based database connection
        // -----------------------------------------

        const promiseDb =
            typeof db.promise === "function"
                ? db.promise()
                : db;

        // Works with a MySQL pool
        if (
            typeof promiseDb.getConnection ===
            "function"
        ) {
            connection =
                await promiseDb.getConnection();

            shouldReleaseConnection = true;
        } else {
            // Works with a regular MySQL connection
            connection = promiseDb;
        }

        if (
            !connection ||
            typeof connection.beginTransaction !==
            "function"
        ) {
            throw new Error(
                "Database connection does not support transactions"
            );
        }

        // -----------------------------------------
        // 3. Start transaction
        // -----------------------------------------

        await connection.beginTransaction();
        transactionStarted = true;

        // -----------------------------------------
        // 4. Get booking details
        // -----------------------------------------

        const [bookings] =
            await connection.query(
                `
                SELECT
                    b.booking_id,
                    b.student_id,
                    b.tutor_id,
                    b.booking_status,
                    b.meeting_link,
                    t.price_per_session AS amount
                FROM Booking b
                JOIN Tutor t
                    ON b.tutor_id = t.tutor_id
                WHERE b.booking_id = ?
                FOR UPDATE
                `,
                [booking_id]
            );

        if (bookings.length === 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        const booking = bookings[0];

        // -----------------------------------------
        // 5. Verify student ownership
        // -----------------------------------------

        if (
            Number(booking.student_id) !==
            Number(student_id)
        ) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(403).json({
                success: false,
                message:
                    "You cannot pay for this booking"
            });
        }

        // -----------------------------------------
        // 6. Check tutor price
        // -----------------------------------------

        if (
            booking.amount === null ||
            booking.amount === undefined
        ) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(400).json({
                success: false,
                message:
                    "Tutor price is missing. Check price_per_session."
            });
        }

        // -----------------------------------------
        // 7. Check booking status
        // -----------------------------------------

        const allowedBookingStatuses = [
            "PENDING",
            "ACCEPTED",
            "TUTOR_ACCEPTED",
            "PAYMENT_PENDING"
        ];

        if (
            !allowedBookingStatuses.includes(
                String(booking.booking_status)
                    .trim()
                    .toUpperCase()
            )
        ) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(400).json({
                success: false,
                message:
                    "Payment is not allowed for booking status: " +
                    booking.booking_status
            });
        }

        // -----------------------------------------
        // 8. Check duplicate payment
        // -----------------------------------------

        const [existingPayments] =
            await connection.query(
                `
                SELECT
                    payment_id,
                    payment_status
                FROM Payment
                WHERE booking_id = ?
                `,
                [booking_id]
            );

        if (existingPayments.length > 0) {
            await connection.rollback();
            transactionStarted = false;

            return res.status(409).json({
                success: false,
                message:
                    "Payment already exists for this booking"
            });
        }

        // -----------------------------------------
        // 9. Insert payment record
        // -----------------------------------------

        const paymentStatus = "SUCCESS";
        const amount = booking.amount;

        await connection.query(
            `
            INSERT INTO Payment
            (
                booking_id,
                student_id,
                amount,
                payment_method,
                payment_reference,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                booking_id,
                student_id,
                amount,
                payment_method,
                payment_reference.trim(),
                paymentStatus
            ]
        );

        // -----------------------------------------
        // 10. Generate meeting link
        // -----------------------------------------

        const meetingLink =
            booking.meeting_link ||
            `https://meet.google.com/demo-tutorgo-${booking_id}`;

        // -----------------------------------------
        // 11. Confirm booking
        // -----------------------------------------

        await connection.query(
            `
            UPDATE Booking
            SET
                booking_status = 'CONFIRMED',
                meeting_link = ?
            WHERE booking_id = ?
            `,
            [
                meetingLink,
                booking_id
            ]
        );

        // -----------------------------------------
        // 12. Commit transaction
        // -----------------------------------------

        await connection.commit();
        transactionStarted = false;

        // -----------------------------------------
        // 13. Get Socket.IO objects
        // -----------------------------------------

        const io = req.app.get("io");

        const studentSockets =
            req.app.get("studentSockets");

        const tutorSockets =
            req.app.get("tutorSockets");

        // -----------------------------------------
        // 14. Prepare notification
        // -----------------------------------------

        const notification = {
            booking_id: booking_id,
            booking_status: "CONFIRMED",
            status: "CONFIRMED",
            message:
                "Payment successful. Your booking is confirmed.",
            meeting_link: meetingLink
        };

        // -----------------------------------------
        // 15. Notify student and tutor
        // -----------------------------------------

        if (
            io &&
            studentSockets &&
            tutorSockets
        ) {
            const studentSocketId =
                studentSockets.get(
                    String(student_id)
                );

            const tutorSocketId =
                tutorSockets.get(
                    String(booking.tutor_id)
                );

            if (studentSocketId) {
                io.to(studentSocketId).emit(
                    "paymentConfirmed",
                    notification
                );
            }

            if (tutorSocketId) {
                io.to(tutorSocketId).emit(
                    "paymentConfirmed",
                    notification
                );
            }
        }

        // -----------------------------------------
        // 16. Return successful response
        // -----------------------------------------

        return res.status(201).json({
    success: true,
    booking_id: Number(booking_id),
    message: "Payment successful. Your booking is confirmed.",
    payment_status: "SUCCESS",
    booking_status: "CONFIRMED",
    meeting_link: meetingLink
});

    } catch (error) {
        console.error(
            "Mock payment error:",
            error
        );

        // -----------------------------------------
        // 17. Rollback if transaction is active
        // -----------------------------------------

        if (
            connection &&
            transactionStarted
        ) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Rollback error:",
                    rollbackError.message
                );
            }
        }

        return res.status(500).json({
            success: false,
            message:
                "Payment processing failed",
            error: error.message
        });

    } finally {
        // -----------------------------------------
        // 18. Release pooled connection
        // -----------------------------------------

        if (
            connection &&
            shouldReleaseConnection &&
            typeof connection.release ===
            "function"
        ) {
            connection.release();
        }
    }
});

module.exports = router;