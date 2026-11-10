
const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const ALLOWED_SLOTS = [
    "Morning fasting",
    "After breakfast",
    "After lunch",
    "After dinner"
];

// Get today's date in local YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Validate date format and actual calendar date
function isValidDate(dateString) {
    if (typeof dateString !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const [year, month, day] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

// Validate glucose reading data
function validateReadingData(body, res) {
    const { reading_date, slot, glucose_value } = body;

    if (
        glucose_value === undefined ||
        glucose_value === null ||
        glucose_value === ""
    ) {
        res.status(400).json({
            message: "Please enter a glucose value."
        });
        return null;
    }

    const value = Number(glucose_value);

    if (
        !Number.isInteger(value) ||
        value < 40 ||
        value > 600
    ) {
        res.status(400).json({
            message: "Value must be between 40 and 600 mg/dl."
        });
        return null;
    }

    if (!isValidDate(reading_date)) {
        res.status(400).json({
            message: "Please enter a valid reading date."
        });
        return null;
    }

    if (reading_date > getTodayDate()) {
        res.status(400).json({
            message: "Date cannot be in the future."
        });
        return null;
    }

    if (!ALLOWED_SLOTS.includes(slot)) {
        res.status(400).json({
            message: "Please select a valid reading slot."
        });
        return null;
    }

    return {
        readingDate: reading_date,
        slot: slot,
        glucoseValue: value
    };
}


// CREATE GLUCOSE READING
router.post("/", authMiddleware, async (req, res) => {
    try {
        const data = validateReadingData(req.body, res);

        if (!data) return;

        const userId = req.user.id;

        // Check duplicate reading
        const duplicate = await pool.query(
            `SELECT id FROM glucose_readings
             WHERE user_id = $1
             AND reading_date = $2
             AND slot = $3`,
            [userId, data.readingDate, data.slot]
        );

        if (duplicate.rows.length > 0) {
            return res.status(409).json({
                message: `You already have an ${data.slot} reading for this date.`
            });
        }

        // Check maximum four readings per day
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM glucose_readings
             WHERE user_id = $1
             AND reading_date = $2`,
            [userId, data.readingDate]
        );

        if (Number(countResult.rows[0].count) >= 4) {
            return res.status(400).json({
                message: "You can add only 4 readings per day."
            });
        }

        // Insert reading into PostgreSQL
        const result = await pool.query(
            `INSERT INTO glucose_readings
             (user_id, reading_date, slot, glucose_value)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                userId,
                data.readingDate,
                data.slot,
                data.glucoseValue
            ]
        );

        res.status(201).json({
            message: "Glucose reading added successfully!",
            reading: result.rows[0]
        });

    } catch (error) {
        console.error("Create reading error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "A reading already exists for this date and slot."
            });
        }

        res.status(500).json({
            message: "Server error while adding reading."
        });
    }
});


// GET ALL READINGS FOR LOGGED-IN USER
router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM glucose_readings
             WHERE user_id = $1
             ORDER BY reading_date DESC, created_at DESC`,
            [req.user.id]
        );

        res.status(200).json({
            count: result.rows.length,
            readings: result.rows
        });

    } catch (error) {
        console.error("Get readings error:", error.message);

        res.status(500).json({
            message: "Server error while fetching readings."
        });
    }
});


// GET ONE READING
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM glucose_readings
             WHERE id = $1 AND user_id = $2`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Glucose reading not found."
            });
        }

        res.status(200).json({
            reading: result.rows[0]
        });

    } catch (error) {
        console.error("Get reading error:", error.message);

        res.status(500).json({
            message: "Server error while fetching reading."
        });
    }
});


// UPDATE GLUCOSE READING
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const data = validateReadingData(req.body, res);

        if (!data) return;

        const userId = req.user.id;
        const readingId = req.params.id;

        // Check whether reading belongs to logged-in user
        const existing = await pool.query(
            `SELECT id FROM glucose_readings
             WHERE id = $1 AND user_id = $2`,
            [readingId, userId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                message: "Glucose reading not found."
            });
        }

        // Check duplicate slot, excluding current reading
        const duplicate = await pool.query(
            `SELECT id FROM glucose_readings
             WHERE user_id = $1
             AND reading_date = $2
             AND slot = $3
             AND id <> $4`,
            [userId, data.readingDate, data.slot, readingId]
        );

        if (duplicate.rows.length > 0) {
            return res.status(409).json({
                message: `You already have an ${data.slot} reading for this date.`
            });
        }

        // Check maximum four readings for the target date
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM glucose_readings
             WHERE user_id = $1
             AND reading_date = $2
             AND id <> $3`,
            [userId, data.readingDate, readingId]
        );

        if (Number(countResult.rows[0].count) >= 4) {
            return res.status(400).json({
                message: "You can add only 4 readings per day."
            });
        }

        const result = await pool.query(
            `UPDATE glucose_readings
             SET reading_date = $1,
                 slot = $2,
                 glucose_value = $3
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
            [
                data.readingDate,
                data.slot,
                data.glucoseValue,
                readingId,
                userId
            ]
        );

        res.status(200).json({
            message: "Glucose reading updated successfully!",
            reading: result.rows[0]
        });

    } catch (error) {
        console.error("Update reading error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "A reading already exists for this date and slot."
            });
        }

        res.status(500).json({
            message: "Server error while updating reading."
        });
    }
});


// DELETE GLUCOSE READING
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM glucose_readings
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [req.params.id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Glucose reading not found."
            });
        }

        res.status(200).json({
            message: "Glucose reading deleted successfully!"
        });

    } catch (error) {
        console.error("Delete reading error:", error.message);

        res.status(500).json({
            message: "Server error while deleting reading."
        });
    }
});

module.exports = router;
