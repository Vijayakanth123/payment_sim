// ============================================================
// middleware/validate.js — Input validation using express-validator
// ============================================================

const { body, validationResult } = require("express-validator");

// ── Reusable validation rule sets ───────────────────────────

// Rules for /register
const registerRules = [
  body("username")
    .trim()
    .notEmpty().withMessage("Username is required")
    .isLength({ min: 3, max: 30 }).withMessage("Username must be 3–30 characters")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain letters, numbers, underscores"),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/\d/).withMessage("Password must contain at least one number"),

  body("mobile_number")
    .trim()
    .notEmpty().withMessage("Mobile number is required")
    .matches(/^[0-9]{10}$/).withMessage("Mobile number must be exactly 10 digits"),
];

// Rules for /login (lighter — just check presence)
const loginRules = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// ── Error collector middleware ───────────────────────────────
// Always attach AFTER the rule arrays in the route.
// If validation fails, it short-circuits the request here — controller never runs.
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req); // collect all validation failures
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: "Validation failed",
      // Map to a clean [ { field, message } ] array — easy to display in frontend forms
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next(); // no errors — proceed to controller
};

// ── Export rule sets + error handler ────────────────────────
// Usage in routes:  [...registerRules, handleValidationErrors, controllerFn]
module.exports = {
  registerRules,
  loginRules,
  handleValidationErrors,
};