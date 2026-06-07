const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Project", index: true },
    provider: { type: String, required: true, enum: ["MTN Mobile Money", "Airtel Money", "Vodafone", "Orange"] },
    phone: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["received"], default: "received" },
    reference: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = { Payment };
