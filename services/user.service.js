// ============================================================
// services/user.service.js
// ============================================================

const User    = require("../models/user.model");
const Account = require("../models/account.model");

// ── findReceiver ─────────────────────────────────────────────
// Accepts a 10-digit mobile number OR a username string.
// Returns the matching User document or throws.
async function findReceiver(identifier) {
  let user;

  if (/^\d{10}$/.test(identifier)) {
    // identifier is a mobile number
    user = await User.findOne({ mobile_number: identifier });
  } else {
    user = await User.findOne({ username: identifier.toLowerCase().trim() });
  }

  if (!user) throw new Error("User not found");
  return user;
}

// ── getReceiverAccounts ──────────────────────────────────────
// Given a userId, returns all their accounts (without passcode hash).
// Called after findReceiver so the sender can pick which account to pay into.
async function getReceiverAccounts(userId) {
  const accounts = await Account
    .find({ user: userId })
    .select("-passcode_hashed") // never expose hashes
    .sort({ createdAt: -1 });

  if (!accounts.length) throw new Error("Receiver has no accounts");
  return accounts;
}

module.exports = { findReceiver, getReceiverAccounts };