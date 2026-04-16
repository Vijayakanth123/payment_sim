const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        account_number: {
            type: String,
            required: [true, "Account number is required"],
            unique: true,
            trim: true,
        },
        balance: {
            type: Number,
            required: [true, "Balance is required"],
            default: 0,
        },
        bank_name: {
            type: String,
            required: [true, "Bank name is required"],
            trim: true,
        },
        passcode_hashed: {
            type: String,
            required: [true, "Password is required"],
        },
    }

);

module.exports = mongoose.model("Account", accountSchema);