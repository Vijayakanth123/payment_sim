const Expense       = require("../models/expense.model");
const Group         = require("../models/group.model");
const GroupActivity = require("../models/groupActivity.model");
const mongoose      = require("mongoose");

/**
 * GET /api/groups/:groupId/balances
 *
 * Returns net balance between the logged-in user and every other group member.
 *   amount > 0  → that member owes YOU   (direction: "owed_to_me")
 *   amount < 0  → YOU owe that member    (direction: "i_owe")
 */
exports.getGroupBalances = async (req, res) => {
  try {
    const { groupId } = req.params;
    const myId = req.user.userId.toString();

    const group = await Group.findById(groupId).populate("members", "username email");
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isMember = group.members.some(m => m._id.toString() === myId);
    if (!isMember) return res.status(403).json({ error: "Not part of group" });

    const expenses = await Expense.find({ groupId });

    // ledger[otherUserId] = net amount (positive = they owe me, negative = I owe them)
    const ledger = {};

    for (const expense of expenses) {
      const paidBy = expense.paidBy.toString();

      for (const p of expense.participants) {
        const participantId = p.userId.toString();
        const outstanding   = p.share - (p.paid || 0);
        if (outstanding <= 0) continue;

        if (paidBy === myId && participantId !== myId) {
          ledger[participantId] = (ledger[participantId] || 0) + outstanding;
        } else if (participantId === myId && paidBy !== myId) {
          ledger[paidBy] = (ledger[paidBy] || 0) - outstanding;
        }
      }
    }

    const memberMap = {};
    group.members.forEach(m => {
      memberMap[m._id.toString()] = { name: m.username, email: m.email };
    });

    const balances = Object.entries(ledger)
      .filter(([, amount]) => Math.abs(amount) > 0.009)
      .map(([userId, amount]) => ({
        userId,
        name:      memberMap[userId]?.name  || "Unknown",
        email:     memberMap[userId]?.email || "",
        amount:    parseFloat(amount.toFixed(2)),
        direction: amount > 0 ? "owed_to_me" : "i_owe",
      }))
      .sort((a, b) => a.amount - b.amount);

    res.json({ groupId, balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/groups/:groupId/settle
 * Body: { targetUserId }
 *
 * Marks all amounts I owe to targetUserId as paid.
 */
exports.settleWithUser = async (req, res) => {
  try {
    const { groupId }      = req.params;
    const { targetUserId } = req.body;
    const myId             = req.user.userId.toString();

    if (!targetUserId) return res.status(400).json({ error: "targetUserId required" });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.members.map(m => m.toString()).includes(myId)) {
      return res.status(403).json({ error: "Not part of group" });
    }

    const expenses = await Expense.find({
      groupId,
      paidBy: new mongoose.Types.ObjectId(targetUserId),
      "participants.userId": new mongoose.Types.ObjectId(myId),
    });

    let totalSettled = 0;

    for (const expense of expenses) {
      const p = expense.participants.find(p => p.userId.toString() === myId);
      if (!p) continue;
      const outstanding = p.share - (p.paid || 0);
      if (outstanding <= 0) continue;
      p.paid        = p.share;
      totalSettled += outstanding;
      await expense.save();
    }

    if (totalSettled === 0) {
      return res.status(400).json({ error: "Nothing to settle with this user" });
    }

    await GroupActivity.create({
      groupId,
      type:        "SETTLEMENT_DONE",
      performedBy: myId,
      metadata: { settledWith: targetUserId, amount: parseFloat(totalSettled.toFixed(2)) },
    });

    res.json({
      message:     "Settlement recorded",
      settledWith: targetUserId,
      amount:      parseFloat(totalSettled.toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};