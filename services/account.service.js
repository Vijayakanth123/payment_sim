// services/account.service.js

const Account = require("../models/account.model");

async function findAccountByNumber(account_number) {
  const account = await Account.findOne({ account_number })
    .populate("user", "username mobile_number");

  if (!account) throw new Error("Account not found");

  return account;
}

module.exports = { findAccountByNumber };