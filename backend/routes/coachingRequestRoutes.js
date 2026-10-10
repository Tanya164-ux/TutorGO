const express = require("express");
const db = require("../db");

const router = express.Router();


// =========================================
// CREATE COACHING REQUEST
// =========================================

router.post("/", (req, res) => {

    const {
        student_id,
        subject_id,
        custom_subject,
        topic,
        preferred_time,
        budget,
        mode
    } = req.body;


    // =========================================
    // VALIDATION
    // =========================================

    if (
        !student_id ||
        !topic ||
        !preferred_time
    ) {
        return res.status(400).json({
            error:
                "student_id, topic and preferred_time are required"
        });
    }


    // Either existing subject or custom subject
    if (
        !subject_id &&
        (!custom_subject ||
            !custom_subject.trim())
    ) {
        return res.status(400).json({
            error:
                "Please select or enter a subject"
        });
    }


    // =========================================
    // INSERT REQUEST
    // =========================================

    const sql = `
        INSERT INTO Coaching_Request
        (
            student_id,
            subject_id,
            custom_subject,
            topic,
            preferred_time,
            budget,
            mode,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `;


    db.query(
        sql,
        [
            student_id,

            subject_id || null,

            custom_subject
                ? custom_subject.trim()
                : null,

            topic.trim(),

            preferred_time,

            budget || null,

            mode || "Online"
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "COACHING REQUEST ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Failed to create coaching request",

                    details: err.message
                });

            }


            return res.status(201).json({

                message:
                    "Coaching request created successfully",

                request_id:
                    result.insertId,

                student_id,

                subject_id:
                    subject_id || null,

                custom_subject:
                    custom_subject || null,

                topic,

                preferred_time,

                budget:
                    budget || null,

                mode:
                    mode || "Online",

                status: "PENDING"

            });

        }
    );

});


module.exports = router;