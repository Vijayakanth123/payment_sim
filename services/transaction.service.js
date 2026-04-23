// ============================================================
// services/transaction.service.js
// Core transfer logic isolated from the controller so it can
// be reused by settlements, group payments, etc.
// ============================================================

const mongoose   = require("mongoose");
const bcrypt     = require("bcrypt");
const Account    = require("../models/account.model");
const Transaction = require("../models/transaction.model");

// ── executeTransfer ──────────────────────────────────────────
// Atomically:
//   1. Validates passcode of the sender's account
//   2. Checks sufficient balance
//   3. Debits sender, credits receiver
//   4. Creates a Transaction document with status "success"
//      (or "failed" if anything goes wrong mid-flight)
//
// All DB writes run inside a Mongoose session (ACID transaction).
// Requires MongoDB replica set or Atlas — for standalone dev,
// remove the session lines and accept non-atomic behaviour.
//
// Params:
//   fromAccountId  — sender's Account _id
//   toAccountId    — receiver's Account _id
//   amount         — positive number
//   passcode       — plain-text passcode of the sender's account
//   note           — optional string
//   type           — "payment" | "settlement"  (default "payment")

// async function executeTransfer({
//   fromAccountId,
//   toAccountId,
//   amount,
//   passcode,
//   note = "",
//   type = "payment",
// }) {
//   // ── 1. Load both accounts ────────────────────────────────
//   const fromAccount = await Account.findById(fromAccountId);
//   if (!fromAccount) throw new Error("Sender account not found");

//   const toAccount = await Account.findById(toAccountId);
//   if (!toAccount) throw new Error("Receiver account not found");

//   // ── 2. Prevent sending to yourself ──────────────────────
//   if (fromAccount._id.equals(toAccount._id)) {
//     throw new Error("Cannot transfer to the same account");
//   }

//   // ── 3. Verify sender's account passcode ─────────────────
//   const passcodeMatch = await bcrypt.compare(passcode, fromAccount.passcode_hashed);
//   if (!passcodeMatch) throw new Error("Incorrect account passcode");

//   // ── 4. Validate amount ───────────────────────────────────
//   if (amount <= 0) throw new Error("Amount must be greater than 0");
//   if (fromAccount.balance < amount) throw new Error("Insufficient balance");

//   // ── 5. Run atomic DB operations inside a session ─────────
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   let transaction;
//   try {
//     // Create the transaction record as "pending" first
//     [transaction] = await Transaction.create(
//       [{ fromAccount: fromAccountId, toAccount: toAccountId, amount, status: "pending", type, note }],
//       { session }
//     );

//     // Debit sender
//     await Account.findByIdAndUpdate(
//       fromAccountId,
//       { $inc: { balance: -amount } },
//       { session }
//     );

//     // Credit receiver
//     await Account.findByIdAndUpdate(
//       toAccountId,
//       { $inc: { balance: amount } },
//       { session }
//     );

//     // Mark success
//     transaction.status = "success";
//     await transaction.save({ session });

//     await session.commitTransaction();
//   } catch (err) {
//     await session.abortTransaction();

//     // If a transaction doc was created, mark it failed
//     if (transaction) {
//       transaction.status = "failed";
//       await transaction.save(); // save outside aborted session
//     }

//     throw err; // re-throw so controller can respond with the error
//   } finally {
//     session.endSession();
//   }

//   return transaction;
// }

async function executeTransfer({
  fromAccountId,
  toAccountId,
  amount,
  passcode,
  note = "",
  type = "payment",
}) {
  const fromAccount = await Account.findById(fromAccountId);
  if (!fromAccount) throw new Error("Sender account not found");

  const toAccount = await Account.findById(toAccountId);
  if (!toAccount) throw new Error("Receiver account not found");

  if (fromAccount._id.equals(toAccount._id)) {
    throw new Error("Cannot transfer to the same account");
  }

  const passcodeMatch = await bcrypt.compare(passcode, fromAccount.passcode_hashed);
  if (!passcodeMatch) throw new Error("Incorrect account passcode");

  if (amount <= 0) throw new Error("Amount must be greater than 0");
  if (fromAccount.balance < amount) throw new Error("Insufficient balance");

  // create transaction
  const transaction = await Transaction.create({
    fromAccount: fromAccountId,
    toAccount: toAccountId,
    amount,
    status: "success",
    type,
    note
  });

  // update balances
  fromAccount.balance -= amount;
  toAccount.balance += amount;

  await fromAccount.save();
  await toAccount.save();

  return transaction;
}


module.exports = { executeTransfer };