// ============================================================
// server.js — Entry point: connects DB and starts Express app
// ============================================================

const express = require("express");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth.routes"); // import auth routes

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(express.json()); // parse incoming JSON request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ── Routes ──────────────────────────────────────────────────
// All auth routes will be prefixed with /api/auth
// e.g. POST /api/auth/register, POST /api/auth/login
app.use("/api/auth", authRoutes);

// ── MongoDB Connection ───────────────────────────────────────
const MONGO_URI = "mongodb://localhost:27017/users"; // DB name: "users"

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    // Start server only after DB is ready
    app.listen(3000, () => {
      console.log("🚀 Server running on http://localhost:3000");
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1); // exit if DB fails — don't run without a database
  });