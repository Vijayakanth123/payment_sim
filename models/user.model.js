// ============================================================
// models/user.model.js — Mongoose schema for the users collection
// ============================================================

const mongoose = require("mongoose");

// Define the shape of each document in the "users" collection
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,      // no two users can share a username
      trim: true,        // strip leading/trailing whitespace automatically
      lowercase: true,   // store all usernames in lowercase for consistency
    },

    passcode_hashed: {
      type: String,
      required: [true, "Password is required"],
      // NOTE: we never store plain-text passwords — only bcrypt hashes
    },
  },
  {
    timestamps: true, // auto-adds createdAt + updatedAt fields (useful for auditing)
  }
);

// Export the model — Mongoose will create/use a collection named "users" (auto-pluralized)
module.exports = mongoose.model("User", userSchema);