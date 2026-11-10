
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const authRoutes = require("./routes/authRoutes");
const glucoseRoutes = require("./routes/glucoseRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Authentication APIs
app.use("/api/auth", authRoutes);

// Glucose Reading APIs
app.use("/api/glucose", glucoseRoutes);

// Reports APIs
app.use("/api/reports", reportRoutes);

// Home API
app.get("/", (req, res) => {
    res.send("Sweety Blood Glucose Tracker Backend is Running!");
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);

    try {
        const result = await pool.query("SELECT NOW()");
        console.log("PostgreSQL connected successfully!");
        console.log("Database time:", result.rows[0].now);
    } catch (error) {
        console.error("PostgreSQL connection failed:", error.message);
    }
});
