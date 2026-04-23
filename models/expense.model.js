const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },

  description: {
    type: String,
    required: true
  },

  totalAmount: {
    type: Number,
    required: true
  },

  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  participants: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      share: {
        type: Number,
        required: true
      },
      paid: {
        type: Number,
        default: 0
      }
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);