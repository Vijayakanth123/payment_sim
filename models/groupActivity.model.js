const mongoose = require("mongoose");

const groupActivitySchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    index: true
  },
  type: {
    type: String,
    enum: [
      "GROUP_CREATED",
      "EXPENSE_ADDED",
      "EXPENSE_UPDATED",
      "SETTLEMENT_DONE"
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  metadata: {
    type: Object // flexible payload
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model("GroupActivity", groupActivitySchema);