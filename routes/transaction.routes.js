// ============================================================
// routes/transaction.routes.js
// ============================================================

const express = require("express");
const router  = express.Router();

const { verifyToken } = require("../middleware/auth.middleware");
const {
  searchReceiverRules,
  payRules,
  listRules,
  handleValidationErrors,
} = require("../middleware/transaction.validate");
const {
  searchReceiver,
  pay,
  getTransactions,
  getTransactionById,
} = require("../controllers/transaction.controller");

// Every transaction route requires a valid JWT
router.use(verifyToken);

// ── Pay flow ─────────────────────────────────────────────────

// Step 1 — find receiver + their accounts (frontend shows account selector)
router.post("/search-receiver", searchReceiverRules, handleValidationErrors, searchReceiver);

// Step 2 — confirm & execute the payment
router.post("/pay",             payRules,            handleValidationErrors, pay);

// ── History ──────────────────────────────────────────────────

// List transactions (optionally filtered by accountId, status, page, limit)
router.get("/",    listRules, handleValidationErrors, getTransactions);

// Single transaction detail
router.get("/:id",                                    getTransactionById);

module.exports = router;