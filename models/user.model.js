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
      unique: true,      
      trim: true,        
      lowercase: true,   
    },

    passcode_hashed: {
      type: String,
      required: [true, "Password is required"],
    },

    mobile_number:{ //need to do more about this.
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
    }
  },
  {
    timestamps: true, // auto-adds createdAt + updatedAt fields (useful for auditing)
  }
);

// Export the model — Mongoose will create/use a collection named "users" (auto-pluralized)
module.exports = mongoose.model("User", userSchema);