
const express = require("express");
const router = express.Router();
const db = require("../db");

// Use promise-based database pool
const promiseDb = db.promise();

// =====================================================
// SELECT TUTOR
// POST /api/tutor-requests/:requestId/select
// =====================================================

const selectTutorHandler = async (req, res) => {
    const requestId = req.params.requestId;

    const {
        tutor_id,
        slot_id
    } = req.body;

    if (!tutor_id || !slot_id) {
        return res.status(400).json({
            success: false,
            error: "tutor_id and slot_id are required"
        });
    }

    try {
        // Get coaching request
        const [requestResults] = await promiseDb.query(
            `
            SELECT
                cr.request_id,
                cr.student_id,
                cr.subject_id,
                s.subject_name,
                cr.topic,
                cr.preferred_time,
                cr.budget,
                cr.mode,
                cr.status
            FROM Coaching_Request cr
            LEFT JOIN Subject s
                ON cr.subject_id = s.subject_id
            WHERE cr.request_id = ?
            `,
            [requestId]
        );

        if (requestResults.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Coaching request not found"
            });
        }

        const request = requestResults[0];

        // Verify request status
        if (
            String(request.status).toUpperCase() !== "PENDING"
        ) {
            return res.status(409).json({
                success: false,
                error:
                    "Request is not pending. Current status: " +
                    request.status
            });
        }

        // Check tutor slot
        const [slotResults] = await promiseDb.query(
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
            `,
            [slot_id, tutor_id]
        );

        if (slotResults.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Selected tutor slot not found"
            });
        }

        const slot = slotResults[0];

        if (
            String(slot.status).toUpperCase() !== "AVAILABLE"
        ) {
            return res.status(409).json({
                success: false,
                error: "Selected tutor slot is not available"
            });
        }

        // Keep request pending until tutor accepts
        await promiseDb.query(
            `
            UPDATE Coaching_Request
            SET status = 'PENDING'
            WHERE request_id = ?
            `,
            [requestId]
        );

        // Notify tutor
        const io = req.app.get("io");
        const tutorSockets = req.app.get("tutorSockets");

        // server.js stores Number keys
        const tutorSocketId = tutorSockets
            ? tutorSockets.get(Number(tutor_id))
            : null;

        const notification = {
            request_id: Number(request.request_id),
            student_id: Number(request.student_id),
            subject_id: request.subject_id,
            subject_name: request.subject_name,
            topic: request.topic,
            preferred_time: request.preferred_time,
            budget: request.budget,
            mode: request.mode,
            tutor_id: Number(tutor_id),
            slot_id: Number(slot_id),
            start_time: slot.start_time,
            end_time: slot.end_time,
            status: "PENDING"
        };

        if (io && tutorSocketId) {
            io.to(tutorSocketId).emit(
                "newCoachingRequest",
                notification
            );

            console.log(
                `New request sent to Tutor ${tutor_id}`
            );
        } else {
            console.log(
                `Tutor ${tutor_id} is not connected`
            );
        }

        return res.status(200).json({
            success: true,
            message: tutorSocketId
                ? "Tutor request sent successfully"
                : "Tutor selected. Tutor is currently offline.",
            request_id: Number(request.request_id),
            student_id: Number(request.student_id),
            tutor_id: Number(tutor_id),
            slot_id: Number(slot_id),
            tutor_online: Boolean(tutorSocketId),
            status: "PENDING"
        });

    } catch (error) {
        console.error("SELECT TUTOR ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to select tutor",
            details: error.message
        });
    }
};

router.post(
    "/:requestId/select",
    selectTutorHandler
);

router.post(
    "/select/:requestId",
    selectTutorHandler
);

// =====================================================
// ACCEPT REQUEST
// POST /api/tutor-requests/:requestId/accept
// =====================================================

router.post(
    "/:requestId/accept",
    async (req, res) => {
        const requestId = req.params.requestId;

        const {
            tutor_id,
            slot_id
        } = req.body;

        if (!tutor_id || !slot_id) {
            return res.status(400).json({
                success: false,
                error: "tutor_id and slot_id are required"
            });
        }

        let connection = null;
        let transactionStarted = false;

        try {
            // Get promise-based connection
            connection = await promiseDb.getConnection();

            await connection.beginTransaction();
            transactionStarted = true;

            // Lock coaching request
            const [requestResults] = await connection.query(
                `
                SELECT
                    request_id,
                    student_id,
                    subject_id,
                    topic,
                    preferred_time,
                    budget,
                    mode,
                    status
                FROM Coaching_Request
                WHERE request_id = ?
                FOR UPDATE
                `,
                [requestId]
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
            const studentId = request.student_id;

            // Check request status
            if (
                String(request.status).toUpperCase() !== "PENDING"
            ) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(409).json({
                    success: false,
                    error:
                        "Request is no longer pending. Current status: " +
                        request.status
                });
            }

            // Lock tutor slot
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
                    error: "Tutor availability slot not found"
                });
            }

            const slot = slotResults[0];

            if (
                String(slot.status).toUpperCase() !== "AVAILABLE"
            ) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(409).json({
                    success: false,
                    error: "Tutor slot is no longer available"
                });
            }

            // Create booking
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
                    requestId,
                    studentId,
                    tutor_id,
                    slot_id
                ]
            );

            const bookingId = bookingResult.insertId;

            // Reserve tutor slot
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
                    error: "Unable to reserve tutor slot"
                });
            }

            // Update request status
            const [requestUpdateResult] =
                await connection.query(
                    `
                    UPDATE Coaching_Request
                    SET status = 'ACCEPTED'
                    WHERE request_id = ?
                      AND status = 'PENDING'
                    `,
                    [requestId]
                );

            if (requestUpdateResult.affectedRows === 0) {
                await connection.rollback();
                transactionStarted = false;

                return res.status(409).json({
                    success: false,
                    error: "Request is no longer pending"
                });
            }

            // Commit transaction
            await connection.commit();
            transactionStarted = false;

            // Notify student
            const io = req.app.get("io");
            const studentSockets = req.app.get("studentSockets");

            // server.js stores Number keys
            const studentSocketId = studentSockets
                ? studentSockets.get(Number(studentId))
                : null;

            const notification = {
                request_id: Number(requestId),
                status: "ACCEPTED",
                request_status: "ACCEPTED",
                booking_id: Number(bookingId),
                booking_status: "PAYMENT_PENDING",
                tutor_id: Number(tutor_id),
                slot_id: Number(slot_id),
                start_time: slot.start_time,
                end_time: slot.end_time,
                message:
                    "Your tutor accepted the request. Please complete the demo payment."
            };

            if (io && studentSocketId) {
                io.to(studentSocketId).emit(
                    "requestStatusUpdated",
                    notification
                );

                console.log(
                    `Acceptance notification sent to student ${studentId}`
                );
            } else {
                console.log(
                    `Student ${studentId} is not connected`
                );
            }

            return res.status(200).json({
                success: true,
                message:
                    "Request accepted. Student must complete payment.",
                request_id: Number(requestId),
                student_id: Number(studentId),
                tutor_id: Number(tutor_id),
                slot_id: Number(slot_id),
                booking_id: Number(bookingId),
                request_status: "ACCEPTED",
                booking_status: "PAYMENT_PENDING",
                slot_status: "BOOKED"
            });

        } catch (error) {
            console.error("ACCEPT REQUEST ERROR:", error);

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
                    error: "Failed to accept request",
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
    }
);

// =====================================================
// REJECT REQUEST
// POST /api/tutor-requests/:requestId/reject
// =====================================================

router.post(
    "/:requestId/reject",
    async (req, res) => {
        const requestId = req.params.requestId;

        const {
            tutor_id
        } = req.body;

        if (!tutor_id) {
            return res.status(400).json({
                success: false,
                error: "tutor_id is required"
            });
        }

        try {
            const [requestResults] = await promiseDb.query(
                `
                SELECT
                    request_id,
                    student_id,
                    status
                FROM Coaching_Request
                WHERE request_id = ?
                `,
                [requestId]
            );

            if (requestResults.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Request not found"
                });
            }

            const request = requestResults[0];
            const studentId = request.student_id;

            if (
                String(request.status).toUpperCase() !== "PENDING"
            ) {
                return res.status(409).json({
                    success: false,
                    error:
                        "Request is no longer pending. Current status: " +
                        request.status
                });
            }

            const [updateResult] = await promiseDb.query(
                `
                UPDATE Coaching_Request
                SET status = 'REJECTED'
                WHERE request_id = ?
                  AND status = 'PENDING'
                `,
                [requestId]
            );

            if (updateResult.affectedRows === 0) {
                return res.status(409).json({
                    success: false,
                    error: "Request is no longer pending"
                });
            }

            // Notify student
            const io = req.app.get("io");
            const studentSockets = req.app.get("studentSockets");

            const studentSocketId = studentSockets
                ? studentSockets.get(Number(studentId))
                : null;

            const notification = {
                request_id: Number(requestId),
                status: "REJECTED",
                request_status: "REJECTED",
                tutor_id: Number(tutor_id),
                message: "Your tutor request has been rejected."
            };

            if (io && studentSocketId) {
                io.to(studentSocketId).emit(
                    "requestStatusUpdated",
                    notification
                );

                console.log(
                    `Rejection notification sent to student ${studentId}`
                );
            } else {
                console.log(
                    `Student ${studentId} is not connected`
                );
            }

            return res.status(200).json({
                success: true,
                message: "Tutor request rejected",
                request_id: Number(requestId),
                student_id: Number(studentId),
                tutor_id: Number(tutor_id),
                status: "REJECTED"
            });

        } catch (error) {
            console.error("REJECT REQUEST ERROR:", error);

            if (!res.headersSent) {
                return res.status(500).json({
                    success: false,
                    error: "Failed to reject request",
                    details: error.message
                });
            }
        }
    }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;