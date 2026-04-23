// ============================================================
// routes/account.routes.js
// All routes are protected — verifyToken runs first on every one.
// ============================================================

const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth.middleware");
const {
  createAccountRules,
  accountIdRules,
  verifyPasscodeRules,
  handleValidationErrors,
} = require("../middleware/account.validate");
const {
  createAccount,
  getMyAccounts,
  getAccountById,
  deleteAccount,
  verifyPasscode,
  getSecureBalance,
} = require("../controllers/account.controller");

const Account = require("../models/account.model");

router.get("/my-accounts", verifyToken, async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user.userId })
      .select("-passcode_hashed");

    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// Every account route requires a valid JWT
router.use(verifyToken);

// POST   /api/accounts               — create a new account
router.post(  "/",       createAccountRules,   handleValidationErrors, createAccount);

// GET    /api/accounts               — list all my accounts
router.get(   "/",                                                      getMyAccounts);

// GET    /api/accounts/:id           — get one account by ID
router.get(   "/:id",    accountIdRules,        handleValidationErrors, getAccountById);

// DELETE /api/accounts/:id           — delete an account
router.delete("/:id",    accountIdRules,        handleValidationErrors, deleteAccount);

// POST   /api/accounts/:id/verify-passcode — verify passcode before sensitive actions
router.post(  "/:id/verify-passcode", verifyPasscodeRules, handleValidationErrors, verifyPasscode);

router.post("/secure-balance", verifyToken, getSecureBalance);

module.exports = router;