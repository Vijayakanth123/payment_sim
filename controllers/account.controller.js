// ============================================================
// controllers/account.controller.js
// All routes here are already protected by verifyToken —
// req.user.userId is guaranteed to be set.
// ============================================================

const bcrypt = require("bcrypt");
const Account = require("../models/account.model");
const User = require("../models/user.model");

const SALT_ROUNDS = 10;

// ── Helper: generate a unique 10-digit account number ────────
const generateAccountNumber = async () => {
  let accountNumber, exists;
  do {
    // Produce a random 10-digit string e.g. "4823019654"
    accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    exists = await Account.findOne({ account_number: accountNumber });
  } while (exists); // retry on the rare collision
  return accountNumber;
};

// ── CREATE — POST /api/accounts ──────────────────────────────
// Input: { balance, passcode, bank_name }
// Creates one account linked to the logged-in user.
exports.createAccount = async (req, res) => {
  try {
    const { balance, passcode, bank_name } = req.body;

    // Hash the account passcode — separate from the login password
    const passcode_hashed = await bcrypt.hash(passcode, SALT_ROUNDS);

    const account_number = await generateAccountNumber();

    const account = await Account.create({
      user: req.user.userId,   // from JWT payload via verifyToken
      account_number,
      balance,
      bank_name,
      passcode_hashed,
    });

    // Never return the hash to the client
    return res.status(201).json({
      message: "Account created successfully",
      account: {
        _id: account._id,
        account_number: account.account_number,
        bank_name: account.bank_name,
        balance: account.balance,
        createdAt: account.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create account", details: err.message });
  }
};

// ── GET ALL — GET /api/accounts ──────────────────────────────
// Returns all accounts belonging to the logged-in user.
exports.getMyAccounts = async (req, res) => {
  try {
    const accounts = await Account
      .find({ user: req.user.userId })
      .select("-passcode_hashed") // never expose hash
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: accounts.length, accounts });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch accounts", details: err.message });
  }
};

// ── GET ONE — GET /api/accounts/:id ──────────────────────────
// Ownership check: account.user must match the token's userId.
exports.getAccountById = async (req, res) => {
  try {
    const account = await Account
      .findById(req.params.id)
      .select("-passcode_hashed");

    if (!account) return res.status(404).json({ error: "Account not found" });

    // Prevent one user from reading another user's account
    if (account.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden: not your account" });
    }

    return res.status(200).json({ account });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch account", details: err.message });
  }
};

// ── DELETE — DELETE /api/accounts/:id ────────────────────────
// Ownership check included.
exports.deleteAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) return res.status(404).json({ error: "Account not found" });

    if (account.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden: not your account" });
    }

    await account.deleteOne();
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete account", details: err.message });
  }
};

// ── VERIFY PASSCODE — POST /api/accounts/:id/verify-passcode ─
// Used before sensitive actions (e.g. transfer, withdrawal).
// Returns a boolean — lets the frontend decide what to do next.
exports.verifyPasscode = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) return res.status(404).json({ error: "Account not found" });

    if (account.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden: not your account" });
    }

    const isMatch = await bcrypt.compare(req.body.passcode, account.passcode_hashed);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect passcode" });
    }

    // ✅ Passcode is correct
    // TODO: You could issue a short-lived "action token" here for a transfer step
    return res.status(200).json({ message: "Passcode verified", verified: true });
  } catch (err) {
    return res.status(500).json({ error: "Verification failed", details: err.message });
  }
};


// POST /api/accounts/secure-balance
exports.getSecureBalance = async (req, res) => {
  try {
    const { password } = req.body;

    // get user
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // verify password
    const match = await bcrypt.compare(password, user.passcode_hashed);
    if (!match) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // fetch accounts
    const accounts = await Account.find({ user: req.user.userId })
      .select("-passcode_hashed");

    res.json({ accounts });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch balance" });
  }
};