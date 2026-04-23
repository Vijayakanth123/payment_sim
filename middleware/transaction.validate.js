// ============================================================
// middleware/transaction.validate.js
// ============================================================

const { body, param, query, validationResult } = require("express-validator");

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

// ── POST /api/transactions/search-receiver ───────────────────
// Step 1 of the pay flow: find a user by mobile or username
const searchReceiverRules = [
  body("identifier")
    .trim()
    .notEmpty().withMessage("Mobile number or username is required")
    .isLength({ min: 3 }).withMessage("Identifier too short"),
];

// ── POST /api/transactions/pay ───────────────────────────────
// Step 2: execute the payment
const payRules = [
  body("fromAccountId")
    .notEmpty().withMessage("Sender account is required")
    .isMongoId().withMessage("Invalid sender account ID"),

  body("toAccountId")
    .notEmpty().withMessage("Receiver account is required")
    .isMongoId().withMessage("Invalid receiver account ID"),

  body("amount")
    .notEmpty().withMessage("Amount is required")
    .isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),

  body("passcode")
    .notEmpty().withMessage("Account passcode is required"),

  body("note")
    .optional()
    .isLength({ max: 200 }).withMessage("Note too long"),

  body("type")
    .optional()
    .isIn(["payment", "settlement"]).withMessage("Invalid transaction type"),
];

// ── GET /api/transactions — query param validation ───────────
const listRules = [
  query("accountId")
    .optional()
    .isMongoId().withMessage("Invalid accountId"),

  query("status")
    .optional()
    .isIn(["pending", "success", "failed"]).withMessage("Invalid status"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("Limit must be 1–100"),

  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("Page must be >= 1"),
];

module.exports = {
  searchReceiverRules,
  payRules,
  listRules,
  handleValidationErrors,
};