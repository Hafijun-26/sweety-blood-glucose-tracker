
const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Helper: Validate YYYY-MM-DD date
function isValidDate(date) {
    if (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const [year, month, day] = date.split("-").map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    return (
        parsedDate.getUTCFullYear() === year &&
        parsedDate.getUTCMonth() === month - 1 &&
        parsedDate.getUTCDate() === day
    );
}

// Helper: Get current local date
function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Helper: Add days to a date
function addDays(date, days) {
    const [year, month, day] = date.split("-").map(Number);
    const result = new Date(Date.UTC(year, month - 1, day + days));

    return result.toISOString().slice(0, 10);
}

// Helper: Get summary for a date range
async function getSummary(userId, startDate, endDateExclusive) {
    const result = await pool.query(
        `SELECT
            MAX(glucose_value)::int AS highest,
            MIN(glucose_value)::int AS lowest,
            ROUND(AVG(glucose_value)::numeric, 1) AS average,
            COUNT(*)::int AS count
         FROM glucose_readings
         WHERE user_id = $1
         AND reading_date >= $2::date
         AND reading_date < $3::date`,
        [userId, startDate, endDateExclusive]
    );

    const row = result.rows[0];

    return {
        highest: row.highest === null ? null : Number(row.highest),
        lowest: row.lowest === null ? null : Number(row.lowest),
        average: row.average === null ? null : Number(row.average),
        count: Number(row.count)
    };
}

// 1. DAILY REPORT
router.get("/daily", authMiddleware, async (req, res) => {
    try {
        const { date } = req.query;

        if (!isValidDate(date)) {
            return res.status(400).json({
                message: "Please provide a valid date in YYYY-MM-DD format."
            });
        }

        if (date > getToday()) {
            return res.status(400).json({
                message: "Date cannot be in the future."
            });
        }

        const summary = await getSummary(
            req.user.id,
            date,
            addDays(date, 1)
        );

        const readingsResult = await pool.query(
            `SELECT
                id,
                TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                slot,
                glucose_value,
                created_at
             FROM glucose_readings
             WHERE user_id = $1
             AND reading_date = $2::date
             ORDER BY CASE slot
                WHEN 'Morning fasting' THEN 1
                WHEN 'After breakfast' THEN 2
                WHEN 'After lunch' THEN 3
                WHEN 'After dinner' THEN 4
             END`,
            [req.user.id, date]
        );

        res.status(200).json({
            reportType: "daily",
            date: date,
            summary: summary,
            readings: readingsResult.rows
        });

    } catch (error) {
        console.error("Daily report error:", error.message);

        res.status(500).json({
            message: "Failed to generate daily report."
        });
    }
});

// 2. MONTH-TO-DATE REPORT
router.get("/month-to-date", authMiddleware, async (req, res) => {
    try {
        const { date } = req.query;

        if (!isValidDate(date)) {
            return res.status(400).json({
                message: "Please provide a valid date in YYYY-MM-DD format."
            });
        }

        if (date > getToday()) {
            return res.status(400).json({
                message: "Date cannot be in the future."
            });
        }

        const startDate = `${date.slice(0, 7)}-01`;
        const endDateExclusive = addDays(date, 1);

        const summary = await getSummary(
            req.user.id,
            startDate,
            endDateExclusive
        );

        res.status(200).json({
            reportType: "month-to-date",
            startDate: startDate,
            endDate: date,
            summary: summary
        });

    } catch (error) {
        console.error("Month-to-date report error:", error.message);

        res.status(500).json({
            message: "Failed to generate month-to-date report."
        });
    }
});

// 3. PREVIOUS MONTH REPORT
router.get("/monthly", authMiddleware, async (req, res) => {
    try {
        const now = new Date();

        const previousMonthStart = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
        );

        const currentMonthStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const previousMonthEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            0
        );

        function formatLocalDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");

            return `${year}-${month}-${day}`;
        }

        const startDate = formatLocalDate(previousMonthStart);
        const endDate = formatLocalDate(previousMonthEnd);
        const endDateExclusive = formatLocalDate(currentMonthStart);

        const summary = await getSummary(
            req.user.id,
            startDate,
            endDateExclusive
        );

        res.status(200).json({
            reportType: "monthly",
            month: startDate.slice(0, 7),
            startDate: startDate,
            endDate: endDate,
            summary: summary
        });

    } catch (error) {
        console.error("Monthly report error:", error.message);

        res.status(500).json({
            message: "Failed to generate monthly report."
        });
    }
});

module.exports = router;
