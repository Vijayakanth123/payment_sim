// ============================================================
// controllers/auth.controller.js — Business logic for register & login
// ============================================================

const bcrypt = require("bcrypt");
const User = require("../models/user.model");

const SALT_ROUNDS = 10; // bcrypt work factor — higher = slower hash = more secure
                        // 10 is the standard balance of speed vs security

// ── REGISTER ────────────────────────────────────────────────
// Accepts: { username, password }
// Creates a new user with a hashed password stored as passcode_hashed
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic input validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Check if username already exists (Mongoose unique constraint also catches this,
    // but an explicit check gives a cleaner error message)
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Hash the plain-text password before saving
    // bcrypt.hash() auto-generates a salt and embeds it in the hash string
    const passcode_hashed = await bcrypt.hash(password, SALT_ROUNDS);

    // Create and persist the user document
    const user = await User.create({ username, passcode_hashed });

    // Return success — never send the hash back to the client
    return res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
      username: user.username,
    });
  } catch (err) {
    // Catch unexpected DB/server errors
    return res.status(500).json({ error: "Registration failed", details: err.message });
  }
};

// ── LOGIN ────────────────────────────────────────────────────
// Accepts: { username, password }
// Verifies credentials; extend here to issue JWT tokens for session management
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic input validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Look up user by username
    const user = await User.findOne({ username });
    if (!user) {
      // Use a generic message — don't reveal whether username or password was wrong
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare the submitted plain-text password against the stored bcrypt hash
    // bcrypt.compare() re-hashes with the embedded salt and checks for a match
    const isMatch = await bcrypt.compare(password, user.passcode_hashed);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Credentials are valid
    // TODO: Generate and return a JWT here for stateless session management
    //   import jwt from "jsonwebtoken"
    //   const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    //   return res.json({ token });

    return res.status(200).json({
      message: "Login successful",
      userId: user._id,
      username: user.username,
    });
  } catch (err) {
    return res.status(500).json({ error: "Login failed", details: err.message });
  }
};