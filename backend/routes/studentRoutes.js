
const express = require("express");
const router = express.Router();

const db = require("../db");


// =========================================
// CREATE STUDENT
// POST /api/students
// =========================================

router.post("/", (req, res) => {

    const {
        name,
        email,
        education_level
    } = req.body;


    // -----------------------------------------
    // Basic validation
    // -----------------------------------------

    if (
        !name ||
        !email ||
        !education_level
    ) {

        return res.status(400).json({
            error:
                "Name, email and class/degree year are required"
        });

    }


    const sql = `
        INSERT INTO Student
        (
            name,
            email,
            education_level
        )
        VALUES (?, ?, ?)
    `;


    db.query(
        sql,
        [
            name.trim(),
            email.trim(),
            education_level.trim()
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "STUDENT CREATE ERROR:",
                    err
                );


                if (err.code === "ER_DUP_ENTRY") {

                    return res.status(409).json({
                        error:
                            "A student with this email already exists"
                    });

                }


                return res.status(500).json({
                    error: "Failed to create student",
                    details: err.message
                });

            }


            res.status(201).json({

                message:
                    "Student created successfully",

                student_id:
                    result.insertId,

                name:
                    name.trim(),

                email:
                    email.trim(),

                education_level:
                    education_level.trim()

            });

        }
    );

});


// =========================================
// GET STUDENT PROFILE BY EMAIL
// GET /api/students/profile?email=...
// =========================================

router.get("/profile", (req, res) => {

    const {
        email
    } = req.query;


    if (!email) {

        return res.status(400).json({
            error: "Email is required"
        });

    }


    const sql = `
        SELECT
            student_id,
            name,
            email,
            education_level
        FROM Student
        WHERE email = ?
    `;


    db.query(
        sql,
        [email.trim()],
        (err, results) => {

            if (err) {

                console.error(
                    "STUDENT PROFILE ERROR:",
                    err
                );


                return res.status(500).json({
                    error:
                        "Failed to fetch student profile",

                    details:
                        err.message
                });

            }


            if (results.length === 0) {

                return res.status(404).json({
                    error:
                        "Student profile not found"
                });

            }


            res.json({

                student:
                    results[0]

            });

        }
    );

});


// =========================================
// UPDATE STUDENT PROFILE
// PUT /api/students/:studentId
// =========================================

router.put("/:studentId", (req, res) => {

    const studentId = Number(
        req.params.studentId
    );


    const {
        name,
        email,
        education_level
    } = req.body;


    // -----------------------------------------
    // Validate student ID
    // -----------------------------------------

    if (
        !Number.isInteger(studentId) ||
        studentId <= 0
    ) {

        return res.status(400).json({
            error:
                "Invalid student ID"
        });

    }


    // -----------------------------------------
    // Validate required fields
    // -----------------------------------------

    if (
        !name ||
        !email ||
        !education_level
    ) {

        return res.status(400).json({
            error:
                "Name, email and education level are required"
        });

    }


    // -----------------------------------------
    // Update student
    // -----------------------------------------

    const sql = `
        UPDATE Student
        SET
            name = ?,
            email = ?,
            education_level = ?
        WHERE student_id = ?
    `;


    db.query(
        sql,
        [
            name.trim(),
            email.trim(),
            education_level.trim(),
            studentId
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "STUDENT UPDATE ERROR:",
                    err
                );


                if (err.code === "ER_DUP_ENTRY") {

                    return res.status(409).json({
                        error:
                            "This email is already used by another student"
                    });

                }


                return res.status(500).json({
                    error:
                        "Failed to update student profile",

                    details:
                        err.message
                });

            }


            if (result.affectedRows === 0) {

                return res.status(404).json({
                    error:
                        "Student not found"
                });

            }


            return res.status(200).json({

                success: true,

                message:
                    "Student profile updated successfully",

                student: {

                    student_id:
                        studentId,

                    name:
                        name.trim(),

                    email:
                        email.trim(),

                    education_level:
                        education_level.trim()

                }

            });

        }
    );

});


module.exports = router;