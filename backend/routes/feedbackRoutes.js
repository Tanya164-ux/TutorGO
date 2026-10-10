
const express = require("express");
const router = express.Router();
const db = require("../db");

// Promise-based database pool
const promiseDb = db.promise();

// =====================================================
// POST /api/feedback
// Submit feedback after completed session
// =====================================================

router.post("/", async (req, res) => {
    const {
        booking_id,
        student_id,
        rating,
        comments
    } = req.body;

    // -----------------------------------------
    // 1. Validate required fields
    // -----------------------------------------

    if (
        !booking_id ||
        !student_id ||
        rating === undefined ||
        rating === null
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Booking ID, student ID and rating are required"
        });
    }

    const numericRating = Number(rating);

    // -----------------------------------------
    // 2. Validate rating
    // -----------------------------------------

    if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Rating must be an integer between 1 and 5"
        });
    }

    // Validate comments length
    if (
        comments !== undefined &&
        comments !== null &&
        typeof comments !== "string"
    ) {
        return res.status(400).json({
            success: false,
            message: "Comments must be text"
        });
    }

    if (
        typeof comments === "string" &&
        comments.length > 1000
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Comments cannot exceed 1000 characters"
        });
    }

    try {
        // -----------------------------------------
        // 3. Check booking ownership and status
        // -----------------------------------------

        const [bookings] = await promiseDb.query(
            `
            SELECT
                booking_id,
                student_id,
                tutor_id,
                booking_status
            FROM Booking
            WHERE booking_id = ?
              AND student_id = ?
            `,
            [
                booking_id,
                student_id
            ]
        );

        if (bookings.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking not found for this student"
            });
        }

        const booking = bookings[0];

        // -----------------------------------------
        // 4. Allow feedback only after completion
        // -----------------------------------------

        if (
            String(booking.booking_status).toUpperCase() !==
            "COMPLETED"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Feedback is available only after session completion",
                current_status:
                    booking.booking_status
            });
        }

        // -----------------------------------------
        // 5. Prevent duplicate feedback
        // -----------------------------------------

        const [existingFeedback] = await promiseDb.query(
            `
            SELECT
                feedback_id
            FROM Feedback
            WHERE booking_id = ?
            `,
            [booking_id]
        );

        if (existingFeedback.length > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "Feedback has already been submitted"
            });
        }

        // -----------------------------------------
        // 6. Insert feedback
        // -----------------------------------------

        const [insertResult] = await promiseDb.query(
            `
            INSERT INTO Feedback
            (
                booking_id,
                student_id,
                tutor_id,
                rating,
                comments
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                booking_id,
                student_id,
                booking.tutor_id,
                numericRating,
                comments && comments.trim()
                    ? comments.trim()
                    : null
            ]
        );

        // -----------------------------------------
        // 7. Optional: update tutor rating
        // -----------------------------------------
        // Tutor rating can be calculated dynamically
        // from Feedback records when needed.

        return res.status(201).json({
            success: true,
            message:
                "Feedback submitted successfully",
            feedback_id: insertResult.insertId,
            booking_id: Number(booking_id),
            rating: numericRating
        });

    } catch (error) {
        console.error(
            "Feedback submission error:",
            error.message
        );

        // Duplicate booking feedback constraint
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "Feedback has already been submitted"
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Failed to submit feedback",
            details: error.message
        });
    }
});

// =====================================================
// GET /api/feedback/booking/:bookingId
// Get feedback for a booking
// =====================================================

router.get(
    "/booking/:bookingId",
    async (req, res) => {
        const { bookingId } = req.params;

        try {
            const [feedback] = await promiseDb.query(
                `
                SELECT
                    f.*,
                    t.name AS tutor_name
                FROM Feedback f
                LEFT JOIN Tutor t
                    ON f.tutor_id = t.tutor_id
                WHERE f.booking_id = ?
                ORDER BY f.feedback_id DESC
                `,
                [bookingId]
            );

            return res.status(200).json({
                success: true,
                feedback: feedback
            });

        } catch (error) {
            console.error(
                "Fetch feedback error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch feedback",
                details: error.message
            });
        }
    }
);

// =====================================================
// GET /api/feedback/tutor/:tutorId
// Get all feedback for a tutor
// =====================================================

router.get(
    "/tutor/:tutorId",
    async (req, res) => {
        const { tutorId } = req.params;

        try {
            const [feedback] = await promiseDb.query(
                `
                SELECT
                    f.*,
                    s.name AS student_name
                FROM Feedback f
                LEFT JOIN Student s
                    ON f.student_id = s.student_id
                WHERE f.tutor_id = ?
                ORDER BY f.feedback_id DESC
                `,
                [tutorId]
            );

            return res.status(200).json({
                success: true,
                feedback: feedback
            });

        } catch (error) {
            console.error(
                "Fetch tutor feedback error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch tutor feedback",
                details: error.message
            });
        }
    }
);

// =====================================================
// GET /api/feedback/tutor/:tutorId/summary
// Get tutor rating summary
// =====================================================

router.get(
    "/tutor/:tutorId/summary",
    async (req, res) => {
        const { tutorId } = req.params;

        try {
            const [summary] = await promiseDb.query(
                `
                SELECT
                    COUNT(*) AS total_reviews,
                    COALESCE(AVG(rating), 0) AS average_rating,
                    SUM(rating = 5) AS five_star,
                    SUM(rating = 4) AS four_star,
                    SUM(rating = 3) AS three_star,
                    SUM(rating = 2) AS two_star,
                    SUM(rating = 1) AS one_star
                FROM Feedback
                WHERE tutor_id = ?
                `,
                [tutorId]
            );

            return res.status(200).json({
                success: true,
                summary: summary[0]
            });

        } catch (error) {
            console.error(
                "Fetch rating summary error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch rating summary",
                details: error.message
            });
        }
    }
);

module.exports = router;