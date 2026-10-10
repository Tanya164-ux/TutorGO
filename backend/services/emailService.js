const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

async function sendFeedbackEmail({
    studentEmail,
    studentName,
    tutorName,
    bookingId
}) {
    const feedbackUrl =
        `http://localhost:5173/feedback/${bookingId}`;

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: studentEmail,
        subject: "TutorGo - Share your session feedback",
        text: `
Hello ${studentName},

Your session with ${tutorName} has been completed.

Please share your feedback:
${feedbackUrl}

Thank you,
TutorGo Team
        `
    });
}

module.exports = {
    sendFeedbackEmail
};