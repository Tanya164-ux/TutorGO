const express = require("express");
const router = express.Router();

const bcrypt = require("bcryptjs");

const db = require("../db");


// =====================================================
// CREATE TUTOR
// POST /api/tutors
// =====================================================

router.post("/", async (req, res) => {

    const {
        name,
        email,
        password,
        qualification,
        experience,
        price_per_session,
        location
    } = req.body;


    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (
        !name ||
        !email ||
        !password ||
        !qualification ||
        experience === undefined ||
        price_per_session === undefined ||
        !location
    ) {

        return res.status(400).json({
            error:
                "Name, email, password, qualification, experience, price and location are required"
        });

    }


    if (password.trim().length < 6) {

        return res.status(400).json({
            error:
                "Password must be at least 6 characters long"
        });

    }


    if (
        !Number.isFinite(Number(experience)) ||
        Number(experience) < 0
    ) {

        return res.status(400).json({
            error:
                "Experience must be a valid non-negative number"
        });

    }


    if (
        !Number.isFinite(Number(price_per_session)) ||
        Number(price_per_session) < 0
    ) {

        return res.status(400).json({
            error:
                "Price must be a valid non-negative number"
        });

    }


    try {

        // -----------------------------------------
        // HASH PASSWORD
        // -----------------------------------------

        const hashedPassword = await bcrypt.hash(
            password.trim(),
            10
        );


        // -----------------------------------------
        // INSERT TUTOR
        // -----------------------------------------

        const sql = `
            INSERT INTO Tutor
            (
                name,
                email,
                password,
                qualification,
                experience,
                price_per_session,
                rating,
                location
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;


        const values = [
            name.trim(),
            email.trim(),
            hashedPassword,
            qualification.trim(),
            Number(experience),
            Number(price_per_session),
            0,
            location.trim()
        ];


        db.query(
            sql,
            values,
            (err, result) => {

                if (err) {

                    console.error(
                        "TUTOR CREATE ERROR:",
                        err
                    );


                    if (err.code === "ER_DUP_ENTRY") {

                        return res.status(409).json({
                            error:
                                "A tutor with this email already exists"
                        });

                    }


                    return res.status(500).json({
                        error:
                            "Failed to create tutor",
                        details:
                            err.message
                    });

                }


                return res.status(201).json({

                    success: true,

                    message:
                        "Tutor created successfully",

                    tutor_id:
                        result.insertId

                });

            }
        );

    } catch (error) {

        console.error(
            "PASSWORD HASH ERROR:",
            error
        );


        return res.status(500).json({
            error:
                "Failed to create tutor"
        });

    }

});


// =====================================================
// TUTOR LOGIN
// POST /api/tutors/login
// =====================================================

router.post("/login", async (req, res) => {

    const {
        email,
        password
    } = req.body;


    // -----------------------------------------
    // VALIDATE INPUT
    // -----------------------------------------

    if (!email || !password) {

        return res.status(400).json({
            error:
                "Email and password are required"
        });

    }


    try {

        // -----------------------------------------
        // FIND TUTOR BY EMAIL
        // -----------------------------------------

        const sql = `
            SELECT
                tutor_id,
                name,
                email,
                password,
                qualification,
                experience,
                price_per_session,
                rating,
                location,
                resume_path
            FROM Tutor
            WHERE email = ?
        `;


        db.query(
            sql,
            [email.trim()],
            async (err, results) => {

                if (err) {

                    console.error(
                        "TUTOR LOGIN DATABASE ERROR:",
                        err
                    );

                    return res.status(500).json({
                        error:
                            "Failed to login tutor"
                    });

                }


                // -----------------------------------------
                // EMAIL NOT FOUND
                // -----------------------------------------

                if (results.length === 0) {

                    return res.status(401).json({
                        error:
                            "Invalid email or password"
                    });

                }


                const tutor = results[0];


                // -----------------------------------------
                // PASSWORD CHECK
                // -----------------------------------------

                if (!tutor.password) {

                    return res.status(401).json({
                        error:
                            "This tutor account does not have a password configured. Please register again or set a password."
                    });

                }


                const passwordMatches =
                    await bcrypt.compare(
                        password,
                        tutor.password
                    );


                if (!passwordMatches) {

                    return res.status(401).json({
                        error:
                            "Invalid email or password"
                    });

                }


                // -----------------------------------------
                // FETCH TUTOR EXPERTISE
                // -----------------------------------------

                const expertiseSQL = `
                    SELECT
                        s.subject_id,
                        s.subject_name,
                        s.topic,
                        te.expertise_level
                    FROM Tutor_Expertise te
                    JOIN Subject s
                        ON te.subject_id = s.subject_id
                    WHERE te.tutor_id = ?
                    ORDER BY s.subject_name
                `;


                db.query(
                    expertiseSQL,
                    [tutor.tutor_id],
                    (expertiseErr, expertiseResults) => {

                        if (expertiseErr) {

                            console.error(
                                "TUTOR EXPERTISE LOGIN ERROR:",
                                expertiseErr
                            );

                            return res.status(500).json({
                                error:
                                    "Failed to load tutor expertise"
                            });

                        }


                        const subjects =
                            expertiseResults.map(
                                (item) =>
                                    item.subject_name
                            );


                        const expertise = {};


                        expertiseResults.forEach(
                            (item) => {

                                expertise[
                                    item.subject_name
                                ] =
                                    item.expertise_level;

                            }
                        );


                        // -----------------------------------------
                        // REMOVE PASSWORD BEFORE SENDING RESPONSE
                        // -----------------------------------------

                        const {
                            password: storedPassword,
                            ...safeTutor
                        } = tutor;


                        return res.status(200).json({

                            success: true,

                            message:
                                "Tutor login successful",

                            tutor: {

                                ...safeTutor,

                                subjects:
                                    subjects,

                                expertise:
                                    expertise,

                                expertise_details:
                                    expertiseResults

                            }

                        });

                    }
                );

            }
        );

    } catch (error) {

        console.error(
            "TUTOR LOGIN ERROR:",
            error
        );


        return res.status(500).json({
            error:
                "Tutor login failed"
        });

    }

});


// =====================================================
// GET TUTOR PROFILE BY EMAIL
// GET /api/tutors/profile?email=...
// =====================================================

router.get("/profile", (req, res) => {

    const {
        email
    } = req.query;


    if (!email) {

        return res.status(400).json({
            error:
                "Email is required"
        });

    }


    const tutorSQL = `
        SELECT
            tutor_id,
            name,
            email,
            qualification,
            experience,
            price_per_session,
            rating,
            location,
            resume_path
        FROM Tutor
        WHERE email = ?
    `;


    db.query(
        tutorSQL,
        [email.trim()],
        (err, tutorResults) => {

            if (err) {

                console.error(
                    "TUTOR PROFILE ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Failed to fetch tutor profile",
                    details:
                        err.message
                });

            }


            if (tutorResults.length === 0) {

                return res.status(404).json({
                    error:
                        "Tutor profile not found"
                });

            }


            const tutor =
                tutorResults[0];


            const expertiseSQL = `
                SELECT
                    s.subject_id,
                    s.subject_name,
                    s.topic,
                    te.expertise_level
                FROM Tutor_Expertise te
                JOIN Subject s
                    ON te.subject_id = s.subject_id
                WHERE te.tutor_id = ?
                ORDER BY s.subject_name
            `;


            db.query(
                expertiseSQL,
                [tutor.tutor_id],
                (expertiseErr, expertiseResults) => {

                    if (expertiseErr) {

                        console.error(
                            "TUTOR EXPERTISE ERROR:",
                            expertiseErr
                        );

                        return res.status(500).json({
                            error:
                                "Failed to fetch tutor expertise",
                            details:
                                expertiseErr.message
                        });

                    }


                    const subjects =
                        expertiseResults.map(
                            (item) =>
                                item.subject_name
                        );


                    const expertise = {};


                    expertiseResults.forEach(
                        (item) => {

                            expertise[
                                item.subject_name
                            ] =
                                item.expertise_level;

                        }
                    );


                    return res.json({

                        tutor: {

                            ...tutor,

                            subjects:
                                subjects,

                            expertise:
                                expertise,

                            expertise_details:
                                expertiseResults

                        }

                    });

                }
            );

        }
    );

});


// =====================================================
// UPDATE TUTOR PROFILE
// PUT /api/tutors/:tutorId
// =====================================================

router.put("/:tutorId", (req, res) => {

    const tutorId =
        Number(req.params.tutorId);


    const {
        name,
        email,
        qualification,
        experience,
        price_per_session,
        location
    } = req.body;


    // -----------------------------------------
    // VALIDATE TUTOR ID
    // -----------------------------------------

    if (
        !Number.isInteger(tutorId) ||
        tutorId <= 0
    ) {

        return res.status(400).json({
            error:
                "Invalid tutor ID"
        });

    }


    // -----------------------------------------
    // VALIDATE REQUIRED FIELDS
    // -----------------------------------------

    if (
        !name ||
        !email ||
        !qualification ||
        experience === undefined ||
        price_per_session === undefined ||
        !location
    ) {

        return res.status(400).json({
            error:
                "Name, email, qualification, experience, price and location are required"
        });

    }


    if (
        !Number.isFinite(
            Number(experience)
        ) ||
        Number(experience) < 0
    ) {

        return res.status(400).json({
            error:
                "Experience must be a valid non-negative number"
        });

    }


    if (
        !Number.isFinite(
            Number(price_per_session)
        ) ||
        Number(price_per_session) < 0
    ) {

        return res.status(400).json({
            error:
                "Price must be a valid non-negative number"
        });

    }


    // -----------------------------------------
    // UPDATE TUTOR
    // -----------------------------------------

    const sql = `
        UPDATE Tutor
        SET
            name = ?,
            email = ?,
            qualification = ?,
            experience = ?,
            price_per_session = ?,
            location = ?
        WHERE tutor_id = ?
    `;


    const values = [

        name.trim(),

        email.trim(),

        qualification.trim(),

        Number(experience),

        Number(price_per_session),

        location.trim(),

        tutorId

    ];


    db.query(
        sql,
        values,
        (err, result) => {

            if (err) {

                console.error(
                    "TUTOR UPDATE ERROR:",
                    err
                );


                if (
                    err.code ===
                    "ER_DUP_ENTRY"
                ) {

                    return res.status(409).json({
                        error:
                            "This email is already used by another tutor"
                    });

                }


                return res.status(500).json({
                    error:
                        "Failed to update tutor profile",
                    details:
                        err.message
                });

            }


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({
                    error:
                        "Tutor not found"
                });

            }


            return res.status(200).json({

                success: true,

                message:
                    "Tutor profile updated successfully",

                tutor: {

                    tutor_id:
                        tutorId,

                    name:
                        name.trim(),

                    email:
                        email.trim(),

                    qualification:
                        qualification.trim(),

                    experience:
                        Number(experience),

                    price_per_session:
                        Number(price_per_session),

                    location:
                        location.trim()

                }

            });

        }
    );

});


module.exports = router;