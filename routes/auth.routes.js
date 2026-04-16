// ============================================================
// routes/auth.routes.js — Auth routes with validation + JWT guard
// ============================================================

const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/auth.controller");
const { registerRules, loginRules, handleValidationErrors } = require("../middleware/validate");
const { verifyToken } = require("../middleware/auth.middleware");

// POST /api/auth/register
// Flow: validate input → catch errors → run controller
router.post("/register", registerRules, handleValidationErrors, register);

// POST /api/auth/login
// Flow: validate input → catch errors → run controller (issues JWT)
router.post("/login", loginRules, handleValidationErrors, login);

// GET /api/auth/me  ← PROTECTED
// Flow: verify JWT → inject req.user → run controller
router.get("/me", verifyToken, getMe);

module.exports = router;