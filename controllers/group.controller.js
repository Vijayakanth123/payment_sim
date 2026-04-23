const { createGroup } = require("../services/group.service");

// POST /api/groups/create
exports.createGroup = async (req, res) => {
  try {
    const { name, participants } = req.body;

    if (!name || !participants) {
      return res.status(400).json({ error: "Name and participants required" });
    }

    const group = await createGroup({
      name,
      userId: req.user.userId, // from JWT
      participants
    });

    return res.status(201).json({
      message: "Group created",
      group
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "username");

    if (!group) return res.status(404).json({ error: "Group not found" });

    // optional: check user is member
    if (!group.members.some(m => m._id.toString() === req.user.userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ group });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch group" });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const userId = req.user.userId; // from JWT

    const groups = await Group.find({
      members: userId
    }).populate("members", "username");

    res.json({ groups });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

const Group = require("../models/group.model");
