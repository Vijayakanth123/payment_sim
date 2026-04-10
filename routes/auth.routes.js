// ============================================================
// routes/auth.routes.js — Defines /register and /login endpoints
// ============================================================

const express = require("express");
const router = express.Router();

const { register, login } = require("../controllers/auth.controller");

// POST /api/auth/register — create a new user account
router.post("/register", register);

// POST /api/auth/login — authenticate an existing user
router.post("/login", login);

module.exports = router;