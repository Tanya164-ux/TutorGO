
const db = require("../db");

// Promise-based database pool
const promiseDb = db.promise();

// =====================================================
// COMPLETE FINISHED SESSIONS
// =====================================================

async function completeFinishedSessions() {
    try {
        const [result] = await promiseDb.query(
            `
            UPDATE Booking b
            INNER JOIN Availability_Slot av
                ON b.slot_id = av.slot_id
            SET b.booking_status = 'COMPLETED'
            WHERE b.booking_status IN (
                'CONFIRMED',
                'IN_PROGRESS'
            )
            AND av.end_time IS NOT NULL
            AND av.end_time <= NOW()
            `
        );

        if (result.affectedRows > 0) {
            console.log(
                `${result.affectedRows} session(s) marked as completed`
            );
        } else {
            console.log(
                "No finished sessions found."
            );
        }

    } catch (error) {
        console.error(
            "Session completion error:",
            error.message
        );
    }
}

// =====================================================
// EXPORT FUNCTION
// =====================================================

module.exports = {
    completeFinishedSessions
};