// ============================================================
// middleware/account.validate.js — Validation rules for account routes
// ============================================================

const { body, param, validationResult } = require("express-validator");

// ── Reusable error handler (same pattern as auth) ────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: "Validation failed",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Rules: POST /accounts (create) ──────────────────────────
const createAccountRules = [
  body("balance")
    .notEmpty().withMessage("Balance is required")
    .isFloat({ min: 0 }).withMessage("Balance must be a non-negative number"),

  body("passcode")
    .notEmpty().withMessage("Passcode is required")
    .isLength({ min: 4 }).withMessage("Passcode must be at least 4 characters"),

  body("bank_name")
    .trim()
    .notEmpty().withMessage("Bank name is required"),
];

// ── Rules: GET /accounts/:id  ────────────────────────────────
const accountIdRules = [
  param("id").isMongoId().withMessage("Invalid account ID"),
];

// ── Rules: POST /accounts/:id/verify-passcode ────────────────
const verifyPasscodeRules = [
  param("id").isMongoId().withMessage("Invalid account ID"),
  body("passcode").notEmpty().withMessage("Passcode is required"),
];

module.exports = {
  createAccountRules,
  accountIdRules,
  verifyPasscodeRules,
  handleValidationErrors,
};