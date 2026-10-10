
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const parseResume = require("../parser/resumeParser");
const db = require("../db");

const router = express.Router();

// =========================================
// UPLOAD DIRECTORY
// =========================================

const uploadDirectory = path.join(
    process.cwd(),
    "uploads",
    "resumes"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}

// =========================================
// MULTER CONFIGURATION
// =========================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },

    filename: function (req, file, cb) {

        const extension = path.extname(file.originalname)
            .toLowerCase();

        const safeName = path
            .basename(
                file.originalname,
                extension
            )
            .replace(/[^a-zA-Z0-9_-]/g, "_");

        cb(
            null,
            `${Date.now()}-${safeName}${extension}`
        );

    }

});

const upload = multer({

    storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {

        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        if (
            file.mimetype === "application/pdf" &&
            extension === ".pdf"
        ) {
            cb(null, true);
        } else {
            cb(
                new Error("Only PDF files are allowed")
            );
        }

    }

});

// =========================================
// DATABASE PROMISE HELPER
// =========================================

function queryDatabase(sql, values = []) {

    return new Promise((resolve, reject) => {

        db.query(
            sql,
            values,
            (error, results) => {

                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }

            }
        );

    });

}

// =========================================
// NORMALIZE SUBJECT NAME
// =========================================

function normalizeSubjectName(subject) {

    return String(subject || "")
        .replace(/\s+/g, " ")
        .trim();

}

// =========================================
// FIND OR CREATE SUBJECT
// =========================================

async function findOrCreateSubject(subjectName) {

    const normalizedName =
        normalizeSubjectName(subjectName);

    if (!normalizedName) {
        return null;
    }

    // First search for an existing subject.
    const existingSubjects = await queryDatabase(
        `
        SELECT subject_id, subject_name
        FROM Subject
        WHERE LOWER(TRIM(subject_name)) =
              LOWER(TRIM(?))
        LIMIT 1
        `,
        [normalizedName]
    );

    if (existingSubjects.length > 0) {

        return existingSubjects[0].subject_id;

    }

    // Create a subject if it doesn't exist.
    const insertResult = await queryDatabase(
        `
        INSERT INTO Subject
        (
            subject_name,
            topic
        )
        VALUES (?, ?)
        `,
        [
            normalizedName,
            normalizedName
        ]
    );

    return insertResult.insertId;

}

// =========================================
// INSERT OR UPDATE TUTOR EXPERTISE
// =========================================

async function saveTutorExpertise(
    tutorId,
    subject,
    expertiseLevel
) {

    const subjectId =
        await findOrCreateSubject(subject);

    if (!subjectId) {
        return;
    }

    await queryDatabase(
        `
        INSERT INTO Tutor_Expertise
        (
            tutor_id,
            subject_id,
            expertise_level
        )
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            expertise_level = VALUES(expertise_level)
        `,
        [
            tutorId,
            subjectId,
            expertiseLevel || "Intermediate"
        ]
    );

}

// =========================================
// UPLOAD AND PARSE RESUME
// =========================================

router.post(
    "/",
    upload.single("resume"),
    async (req, res) => {

        let uploadedFilePath = null;

        try {

            // -----------------------------------------
            // CHECK FILE
            // -----------------------------------------

            if (!req.file) {

                return res.status(400).json({
                    error: "Please upload a PDF resume"
                });

            }

            uploadedFilePath = req.file.path;

            // -----------------------------------------
            // CHECK TUTOR ID
            // -----------------------------------------

            const tutorId = Number(req.body.tutor_id);

            if (
                !Number.isInteger(tutorId) ||
                tutorId <= 0
            ) {

                return res.status(400).json({
                    error: "A valid tutor_id is required"
                });

            }

            // -----------------------------------------
            // READ PDF
            // -----------------------------------------

            const dataBuffer =
                fs.readFileSync(uploadedFilePath);

            const pdfData =
                await pdfParse(dataBuffer);

            const extractedText =
                (pdfData.text || "").trim();

            // -----------------------------------------
            // CHECK EXTRACTED TEXT
            // -----------------------------------------

            if (!extractedText) {

                return res.status(422).json({

                    error:
                        "This PDF contains no extractable text. " +
                        "It may be a scanned/image-only resume. " +
                        "OCR processing is required."

                });

            }

            // -----------------------------------------
            // PARSE RESUME
            // -----------------------------------------

            const parsedData =
                parseResume(extractedText);

            if (!parsedData) {

                return res.status(422).json({
                    error:
                        "Could not extract information from resume"
                });

            }

            // -----------------------------------------
            // GET EXISTING TUTOR
            // -----------------------------------------

            const existingTutorRows =
                await queryDatabase(
                    `
                    SELECT
                        name,
                        qualification,
                        experience,
                        resume_path
                    FROM Tutor
                    WHERE tutor_id = ?
                    LIMIT 1
                    `,
                    [tutorId]
                );

            if (existingTutorRows.length === 0) {

                return res.status(404).json({
                    error: "Tutor not found"
                });

            }

            const existingTutor =
                existingTutorRows[0];

            // -----------------------------------------
            // UPDATE TUTOR PROFILE
            // -----------------------------------------

            const updatedName =
                parsedData.name ||
                existingTutor.name;

            const updatedQualification =
                parsedData.qualification ||
                existingTutor.qualification;

            const updatedExperience =
                parsedData.experience !== null &&
                parsedData.experience !== undefined
                    ? parsedData.experience
                    : existingTutor.experience;

            await queryDatabase(
                `
                UPDATE Tutor
                SET
                    name = ?,
                    qualification = ?,
                    experience = ?,
                    resume_path = ?
                WHERE tutor_id = ?
                `,
                [
                    updatedName,
                    updatedQualification,
                    updatedExperience,
                    uploadedFilePath,
                    tutorId
                ]
            );

            // -----------------------------------------
            // SAVE SUBJECT EXPERTISE
            // -----------------------------------------

            const subjects =
                Array.isArray(parsedData.subjects)
                    ? parsedData.subjects
                    : [];

            const expertise =
                parsedData.expertise || {};

            for (const subject of subjects) {

                const normalizedSubject =
                    normalizeSubjectName(subject);

                if (!normalizedSubject) {
                    continue;
                }

                const expertiseLevel =
                    expertise[subject] ||
                    "Intermediate";

                await saveTutorExpertise(
                    tutorId,
                    normalizedSubject,
                    expertiseLevel
                );

            }

            // -----------------------------------------
            // RESPONSE
            // -----------------------------------------

            return res.status(200).json({

                message:
                    "Resume uploaded and tutor profile updated successfully",

                tutor_id: tutorId,

                file: req.file.filename,

                resume_path: uploadedFilePath,

                parsed_data: {

                    ...parsedData,

                    name: updatedName,

                    qualification:
                        updatedQualification,

                    experience:
                        updatedExperience

                }

            });

        } catch (error) {

            console.error(
                "RESUME PROCESSING ERROR:",
                error
            );

            // Remove uploaded file if processing fails.
            if (
                uploadedFilePath &&
                fs.existsSync(uploadedFilePath)
            ) {

                try {
                    fs.unlinkSync(uploadedFilePath);
                } catch (deleteError) {
                    console.error(
                        "FILE CLEANUP ERROR:",
                        deleteError
                    );
                }

            }

            return res.status(500).json({

                error:
                    "Failed to process resume",

                details:
                    error.message

            });

        }

    }
);

// =========================================
// MULTER ERROR HANDLING
// =========================================

router.use((error, req, res, next) => {

    if (error instanceof multer.MulterError) {

        if (error.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({
                error:
                    "Resume file must be smaller than 10 MB"
            });

        }

        return res.status(400).json({
            error: error.message
        });

    }

    if (error) {

        return res.status(400).json({
            error: error.message
        });

    }

    next();

});

module.exports = router;