const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/auth.middleware");
const { addExpense } = require("../controllers/expense.controller");

router.use(verifyToken);

// add expense
router.post("/add", addExpense);


module.exports = router;