const Expense = require("../models/expense.model");
const Group = require("../models/group.model");
const GroupActivity = require("../models/groupActivity.model");

// POST /api/expenses/add
exports.addExpense = async (req, res) => {
  try {
    const { groupId, description, totalAmount, splits } = req.body;

    if (!groupId || !description || !totalAmount || !splits) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // verify group exists
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // ensure user is in group
    if (!group.members.includes(req.user.userId)) {
      return res.status(403).json({ error: "Not part of group" });
    }

    // filter only participants with share > 0
    const participants = splits
      .filter(s => s.share > 0)
      .map(s => ({
        userId: s.userId,
        share: s.share,
        paid: 0
      }));

    if (participants.length === 0) {
      return res.status(400).json({ error: "No participants selected" });
    }

    // validate sum
    const sum = participants.reduce((a, b) => a + b.share, 0);
    if (sum !== totalAmount) {
      return res.status(400).json({ error: "Split total mismatch" });
    }

    // create expense
    const expense = await Expense.create({
      groupId,
      description,
      totalAmount,
      paidBy: req.user.userId,
      participants
    });

    // 🔥 log activity
    await GroupActivity.create({
      groupId,
      type: "EXPENSE_ADDED",
      performedBy: req.user.userId,
      metadata: {
        amount: totalAmount,
        description,
        splitBetween: participants.map(p => p.userId)
      }
    });

    res.status(201).json({ expense });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};