const { findReceiver } = require("../services/user.service");

// POST /api/users/search
exports.searchUser = async (req, res) => {
  try {
    const { identifier } = req.body;

    const user = await findReceiver(identifier);

    return res.json({
      user: {
        _id: user._id,
        username: user.username,
        mobile_number: user.mobile_number
      }
    });

  } catch (err) {
    const status = err.message === "User not found" ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
};