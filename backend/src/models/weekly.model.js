import mongoose from "mongoose";

const weeklySchema = new mongoose.Schema(
  {
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
    installmentPeriodInDays: {
      type: Number,
      required: true,
      min: 1,
      max: 365, // Allow up to 1 year for installment periods
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

export const Weekly = mongoose.model("Weekly", weeklySchema);
