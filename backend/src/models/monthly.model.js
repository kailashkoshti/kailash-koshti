import mongoose from "mongoose";

const monthlySchema = new mongoose.Schema(
  {
    loanNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    loanAmount: {
      type: Number,
      required: true,
    },
    amountGiven: {
      type: Number,
      required: true,
    },
    issuingDate: {
      type: Date,
      required: true,
    },
    interestAmount: {
      type: Number,
      required: true,
    },
    interestPercentage: {
      type: Number,
      required: true,
    },
    profitAmount: {
      type: Number,
      required: true,
    },
    collectedAmount: {
      type: Number,
      required: true,
    },
    remainingAmount: {
      type: Number,
      required: true,
    },
    installments: [
      {
        period: { type: Number, required: true },
        date: { type: Date, required: true },
        amount: { type: Number, required: true },
        status: {
          type: String,
          enum: ["paid", "missed", "pending"],
          default: "pending",
        },
        paidOn: { type: Date, default: null },
      },
    ],
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Monthly = mongoose.model("Monthly", monthlySchema);
