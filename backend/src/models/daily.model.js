import mongoose from "mongoose";

const dailySchema = new mongoose.Schema(
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
      required: false,
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
    expectedProfit: {
      type: Number,
      required: true,
    },
    totalProfit: {
      type: Number,
      required: true,
    },
    profitPercentage: {
      type: Number,
      required: true,
    },
    numberOfDays: {
      type: Number,
      required: true,
    },
    amountPerDay: {
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
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    installments: [
      {
        period: { type: Number, required: true },
        date: { type: Date, required: true },
        amount: { type: Number, required: true },
        status: {
          type: String,
          enum: ["paid", "pending"],
          default: "pending",
        },
        paidOn: { type: Date, default: null },
      },
    ],
  },
  { timestamps: true }
);

export const Daily = mongoose.model("Daily", dailySchema);
