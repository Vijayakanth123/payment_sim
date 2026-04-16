// ============================================================
// controllers/auth.controller.js — Register + Login with JWT
// ============================================================

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "change_this_in_production";
const JWT_EXPIRES_IN = "1h"; // token lifespan 

// ── REGISTER ────────────────────────────────────────────────
exports.register = async (req, res) => {
  console.log("data reached controller")
  console.log("REQ BODY:", req.body);
  
  try {

    const { username, password, mobile_number } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const existingMobile = await User.findOne({ mobile_number });
    if (existingMobile) {
      return res.status(409).json({ error: "Mobile number already registered" });
    }

    const passcode_hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      username,
      passcode_hashed,
      mobile_number
    });

    return res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
      username: user.username,
    });

  } catch (err) {
    return res.status(500).json({
      error: "Registration failed",
      details: err.message   
    });
  }
};

// ── LOGIN ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passcode_hashed);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Sign a JWT with the user's id and username embedded as the payload
    // The client stores this token and sends it as: Authorization: Bearer <token>
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    return res.status(500).json({ error: "Login failed", details: err.message });
  }
};

// ── PROTECTED EXAMPLE ────────────────────────────────────────
// GET /api/auth/me — requires verifyToken middleware before this runs
// req.user is injected by auth.middleware.js from the decoded JWT
exports.getMe = async (req, res) => {
  try {
    // Never return passcode_hashed to the client
    const user = await User.findById(req.user.userId).select("-passcode_hashed");
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch user", details: err.message });
  }
};