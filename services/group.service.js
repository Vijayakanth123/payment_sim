const Group = require("../models/group.model");

// create group
async function createGroup({ name, userId, participants }) {
  // include creator in group
  const members = [...new Set([userId, ...participants])];

  if (members.length < 2) {
    throw new Error("Group must have at least 2 members");
  }

  const group = await Group.create({
    name,
    members
  });

  return group;
}

module.exports = { createGroup };