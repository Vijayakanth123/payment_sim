// ============================================================
// middleware/auth.middleware.js — JWT verification for protected routes
// ============================================================

const jwt = require("jsonwebtoken");

// Secret key — in production always load from process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || "change_this_in_production";

// ── verifyToken ──────────────────────────────────────────────
// Attach to any route that requires the user to be logged in.
// Expects the client to send:  Authorization: Bearer <token>
const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  // Header must exist and follow the "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1]; // extract token after "Bearer "

  try {
    // jwt.verify() throws if token is expired, malformed, or signature mismatch
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach decoded payload to req so downstream controllers can use it
    // e.g. req.user.userId, req.user.username
    req.user = decoded;

    next(); // token is valid — proceed to the protected controller
  } catch (err) {
    // Differentiate between expired and outright invalid tokens
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired. Please log in again." });
    }
    return res.status(403).json({ error: "Invalid token." });
  }
};

module.exports = { verifyToken };