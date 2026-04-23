const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },

  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },

  type: {
    type: String,
    enum: ['payment', 'settlement'],
    default: 'payment'
  },

  note: String,

  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }

}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);