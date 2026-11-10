const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const bcrypt = require("bcrypt");
const pool = require("./db");

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

async function seedDatabase() {
    try {
        const name = "Demo User";
        const email = "demo@sweety.com";
        const password = "Demo@123";

        const hashedPassword = await bcrypt.hash(password, 10);

        const userResult = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             ON CONFLICT (email)
             DO UPDATE SET
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash
             RETURNING id, name, email`,
            [name, email, hashedPassword]
        );

        const userId = userResult.rows[0].id;
        const today = getToday();

        const sampleReadings = [
            { slot: "Morning fasting", value: 110 },
            { slot: "After breakfast", value: 150 },
            { slot: "After lunch", value: 140 },
            { slot: "After dinner", value: 125 }
        ];

        for (const reading of sampleReadings) {
            await pool.query(
                `INSERT INTO glucose_readings
                    (user_id, reading_date, slot, glucose_value)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, reading_date, slot)
                 DO UPDATE SET
                    glucose_value = EXCLUDED.glucose_value`,
                [userId, today, reading.slot, reading.value]
            );
        }

        console.log("Database seeded successfully!");
        console.log("Demo user:", email);
        console.log("Demo password:", password);
        console.log("Sample readings added:", sampleReadings.length);

    } catch (error) {
        console.error("Database seeding failed:", error.message);
    } finally {
        await pool.end();
    }
}

seedDatabase();
