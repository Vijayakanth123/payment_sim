const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth.middleware");
const { searchUser } = require("../controllers/user.controller");

router.use(verifyToken);

router.post("/search", searchUser);

module.exports = router;