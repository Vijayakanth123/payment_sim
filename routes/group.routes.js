const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.middleware");
const { createGroup, getGroupById, getMyGroups } = require("../controllers/group.controller");
const { getGroupBalances, settleWithUser } = require("../controllers/settlement.controller");

router.use(verifyToken); // applies to all routes below

router.get("/my-groups", getMyGroups);
router.get("/:groupId/balances", getGroupBalances);
router.post("/:groupId/settle", settleWithUser);
router.get("/:id", getGroupById);
router.post("/create", createGroup);

module.exports = router;