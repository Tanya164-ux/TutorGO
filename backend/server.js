
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const db = require("./db");
const cron = require("node-cron");

require("dotenv").config();

// =====================================================
// IMPORT ROUTES
// =====================================================

const tutorRoutes = require("./routes/tutorRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const coachingRequestRoutes = require("./routes/coachingRequestRoutes");
const matchingRoutes = require("./routes/matchingRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const tutorRequestRoutes = require("./routes/tutorRequestRoutes");
const studentRoutes = require("./routes/studentRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");

// =====================================================
// IMPORT SERVICES
// =====================================================

// Ensure this file exists:
// backend/services/sessionCompleteService.js

const {
    completeFinishedSessions
} = require("./services/sessionCompleteService");

// =====================================================
// CREATE EXPRESS APP
// =====================================================

const app = express();

// =====================================================
// CREATE HTTP SERVER
// =====================================================

const server = http.createServer(app);

// =====================================================
// CREATE SOCKET.IO SERVER
// =====================================================

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH"
        ]
    }
});

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// =====================================================
// SOCKET MAPS
// =====================================================

// Use NUMBER IDs consistently
const tutorSockets = new Map();
const studentSockets = new Map();

// Make Socket.IO objects available to routes
app.set("io", io);
app.set("tutorSockets", tutorSockets);
app.set("studentSockets", studentSockets);

// =====================================================
// SOCKET.IO CONNECTION
// =====================================================

io.on("connection", (socket) => {
    console.log(
        "User connected:",
        socket.id
    );

    // =================================================
    // REGISTER TUTOR
    // =================================================

    socket.on("registerTutor", (tutorId) => {
        if (
            tutorId === undefined ||
            tutorId === null
        ) {
            console.log(
                "Tutor registration failed: ID missing"
            );

            return;
        }

        const id = Number(tutorId);

        if (!Number.isInteger(id)) {
            console.log(
                "Tutor registration failed: Invalid ID"
            );

            return;
        }

        tutorSockets.set(id, socket.id);

        socket.tutorId = id;

        console.log(
            `Tutor ${id} registered with socket ${socket.id}`
        );
    });

    // =================================================
    // REGISTER STUDENT
    // =================================================

    socket.on("registerStudent", (studentId) => {
        if (
            studentId === undefined ||
            studentId === null
        ) {
            console.log(
                "Student registration failed: ID missing"
            );

            return;
        }

        const id = Number(studentId);

        if (!Number.isInteger(id)) {
            console.log(
                "Student registration failed: Invalid ID"
            );

            return;
        }

        studentSockets.set(id, socket.id);

        socket.studentId = id;

        console.log(
            `Student ${id} registered with socket ${socket.id}`
        );
    });

    // =================================================
    // REGISTER GENERIC USER
    // =================================================

    socket.on("registerUser", (data) => {
        if (
            !data ||
            !data.role ||
            data.id === undefined ||
            data.id === null
        ) {
            return;
        }

        const id = Number(data.id);

        const role = String(
            data.role
        ).toLowerCase();

        if (!Number.isInteger(id)) {
            return;
        }

        if (role === "student") {
            studentSockets.set(id, socket.id);

            socket.studentId = id;

            console.log(
                `Student ${id} registered with socket ${socket.id}`
            );
        }

        if (role === "tutor") {
            tutorSockets.set(id, socket.id);

            socket.tutorId = id;

            console.log(
                `Tutor ${id} registered with socket ${socket.id}`
            );
        }
    });

    // =================================================
    // DISCONNECT
    // =================================================

    socket.on("disconnect", (reason) => {
        console.log(
            "User disconnected:",
            socket.id,
            "Reason:",
            reason
        );

        // Remove tutor socket safely
        if (socket.tutorId !== undefined) {
            const currentSocket =
                tutorSockets.get(
                    Number(socket.tutorId)
                );

            if (currentSocket === socket.id) {
                tutorSockets.delete(
                    Number(socket.tutorId)
                );

                console.log(
                    `Tutor ${socket.tutorId} removed`
                );
            }
        }

        // Remove student socket safely
        if (socket.studentId !== undefined) {
            const currentSocket =
                studentSockets.get(
                    Number(socket.studentId)
                );

            if (currentSocket === socket.id) {
                studentSockets.delete(
                    Number(socket.studentId)
                );

                console.log(
                    `Student ${socket.studentId} removed`
                );
            }
        }
    });
});

// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {
    return res.status(200).send(
        "TutorGo Backend is Running!"
    );
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "TutorGo backend is healthy"
    });
});

// =====================================================
// GET ALL TUTORS
// =====================================================

app.get("/tutors", (req, res) => {
    const sql = "SELECT * FROM Tutor";

    db.query(sql, (error, results) => {
        if (error) {
            console.error(
                "Get tutors error:",
                error
            );

            return res.status(500).json({
                success: false,
                error: "Database query failed"
            });
        }

        return res.status(200).json({
            success: true,
            tutors: results
        });
    });
});

// =====================================================
// API ROUTES
// =====================================================

app.use(
    "/api/tutors",
    tutorRoutes
);

app.use(
    "/api/resume",
    resumeRoutes
);

app.use(
    "/api/availability",
    availabilityRoutes
);

app.use(
    "/api/requests",
    coachingRequestRoutes
);

app.use(
    "/api/matching",
    matchingRoutes
);

app.use(
    "/api/bookings",
    bookingRoutes
);

app.use(
    "/api/tutor-requests",
    tutorRequestRoutes
);

app.use(
    "/api/students",
    studentRoutes
);

app.use(
    "/api/payments",
    paymentRoutes
);

app.use(
    "/api/feedback",
    feedbackRoutes
);

// =====================================================
// AUTOMATIC SESSION COMPLETION
// =====================================================

// Runs every minute
cron.schedule("* * * * *", async () => {
    try {
        await completeFinishedSessions();
    } catch (error) {
        console.error(
            "Session completion job error:",
            error
        );
    }
});

// =====================================================
// 404 ROUTE
// =====================================================

app.use((req, res) => {
    if (res.headersSent) {
        return;
    }

    return res.status(404).json({
        success: false,
        error: "Route not found",
        path: req.originalUrl
    });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
    console.error(
        "SERVER ERROR:",
        error
    );

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message
    });
});

// =====================================================
// START SERVER
// =====================================================

const PORT =
    Number(process.env.PORT) || 5000;

server.listen(PORT, () => {
    console.log(
        `Server running on http://localhost:${PORT}`
    );
});

// =====================================================
// HANDLE SERVER ERRORS
// =====================================================

server.on("error", (error) => {
    console.error(
        "HTTP server error:",
        error
    );
});