// ============================================================
// controllers/transaction.controller.js
// All routes are JWT-protected (verifyToken runs before these).
//
// Pay flow (2 API calls from the frontend):
//   1. POST /api/transactions/search-receiver
//        → returns receiver user + their accounts
//   2. POST /api/transactions/pay
//        → verifies sender passcode, transfers money, creates record
// ============================================================

const Account     = require("../models/account.model");
const Transaction = require("../models/transaction.model");
const { findReceiver, getReceiverAccounts } = require("../services/user.service");
const { executeTransfer }                   = require("../services/transaction.service");
const { findAccountByNumber } = require("../services/account.service");
// ── STEP 1: Search receiver ──────────────────────────────────
// POST /api/transactions/search-receiver
// Body: { identifier }  — mobile number (10 digits) or username
//
// Returns receiver's public profile + all their accounts.
// Frontend shows these accounts so the sender can pick one.
exports.searchReceiver = async (req, res) => {
  try {
    const { identifier } = req.body;

    // Prevent paying yourself by accident
    const receiver = await findReceiver(identifier);
    if (receiver._id.toString() === req.user.userId) {
      return res.status(400).json({ error: "You cannot pay yourself" });
    }

    const accounts = await getReceiverAccounts(receiver._id);

    return res.status(200).json({
      receiver: {
        _id:      receiver._id,
        username: receiver.username,
        // expose only what the sender needs to see
        mobile_number: receiver.mobile_number?.replace(/\d(?=\d{4})/g, "*"), // mask: ******1234
      },
      accounts, // list of receiver's accounts — sender picks one
    });
  } catch (err) {
    const status = err.message === "User not found" ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
};

// ── STEP 2: Execute payment ──────────────────────────────────
// POST /api/transactions/pay
// Body: { fromAccountId, toAccountId, amount, passcode, note?, type? }
//
// Validates that fromAccount belongs to the logged-in user,
// then delegates the atomic transfer to transaction.service.js
exports.pay = async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, passcode, note, type } = req.body;

    // Ownership check — ensure the sender owns the fromAccount
    const fromAccount = await Account.findById(fromAccountId);
    if (!fromAccount) {
      return res.status(404).json({ error: "Sender account not found" });
    }
    if (fromAccount.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden: not your account" });
    }

    // executeTransfer handles: passcode check, balance check, atomic debit/credit
    const transaction = await executeTransfer({
      fromAccountId,
      toAccountId,
      amount,
      passcode,
      note,
      type,
    });

    return res.status(201).json({
      message: "Payment successful",
      transaction: {
        _id:         transaction._id,
        fromAccount: transaction.fromAccount,
        toAccount:   transaction.toAccount,
        amount:      transaction.amount,
        status:      transaction.status,
        type:        transaction.type,
        note:        transaction.note,
        createdAt:   transaction.createdAt,
      },
    });
  } catch (err) {
    // Map known business errors to proper HTTP codes
    const clientErrors = {
      "Incorrect account passcode":  401,
      "Insufficient balance":        422,
      "Cannot transfer to the same account": 400,
      "Receiver account not found":  404,
      "Sender account not found":    404,
      "Amount must be greater than 0": 422,
    };
    const status = clientErrors[err.message] || 500;
    return res.status(status).json({ error: err.message });
  }
};

// ── LIST TRANSACTIONS ────────────────────────────────────────
// GET /api/transactions?accountId=&status=&page=1&limit=20
//
// If accountId is given, only returns transactions for that account
// (after verifying ownership). Otherwise returns ALL transactions
// for every account the logged-in user owns.
exports.getTransactions = async (req, res) => {
  try {
    const { accountId, status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let accountIds;

    if (accountId) {
      // Verify the user owns this account
      const account = await Account.findById(accountId);
      if (!account) return res.status(404).json({ error: "Account not found" });
      if (account.user.toString() !== req.user.userId) {
        return res.status(403).json({ error: "Forbidden: not your account" });
      }
      accountIds = [accountId];
    } else {
      // Pull all accounts owned by this user
      const myAccounts = await Account.find({ user: req.user.userId }).select("_id");
      accountIds = myAccounts.map((a) => a._id);
    }

    // Match transactions where the user is sender OR receiver
    const filter = {
      $or: [
        { fromAccount: { $in: accountIds } },
        { toAccount:   { $in: accountIds } },
      ],
    };
    if (status) filter.status = status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("fromAccount", "account_number bank_name")
        .populate("toAccount",   "account_number bank_name")
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      total,
      page:  Number(page),
      pages: Math.ceil(total / limit),
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch transactions", details: err.message });
  }
};

// ── GET ONE TRANSACTION ──────────────────────────────────────
// GET /api/transactions/:id
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("fromAccount", "account_number bank_name user")
      .populate("toAccount",   "account_number bank_name user");

    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    // Only sender or receiver can view the transaction
    const myAccounts = await Account.find({ user: req.user.userId }).select("_id");
    const myIds = myAccounts.map((a) => a._id.toString());

    const involved =
      myIds.includes(transaction.fromAccount._id.toString()) ||
      myIds.includes(transaction.toAccount._id.toString());

    if (!involved) return res.status(403).json({ error: "Forbidden" });

    return res.status(200).json({ transaction });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch transaction", details: err.message });
  }
};

// controllers/transaction.controller.js

exports.searchByAccountNumber = async (req, res) => {
  try {
    const { account_number } = req.body;

    const account = await findAccountByNumber(account_number);

    // prevent self-payment
    if (account.user._id.toString() === req.user.userId) {
      return res.status(400).json({ error: "You cannot pay yourself" });
    }

    return res.status(200).json({
      receiver: {
        _id: account.user._id,
        username: account.user.username,
        mobile_number: account.user.mobile_number?.replace(/\d(?=\d{4})/g, "*"),
      },
      accounts: [
        {
          _id: account._id,
          bank_name: account.bank_name,
          account_number: account.account_number,
        },
      ],
    });

  } catch (err) {
    const status = err.message === "Account not found" ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
};