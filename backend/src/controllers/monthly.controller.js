import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Monthly } from "../models/monthly.model.js";
import { getNextLoanNumber } from "../utils/loanNumberGenerator.js";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const createMonthlyLoan = asyncHandler(async (req, res) => {
  // Extract data from request body
  const {
    customerName,
    phoneNumber,
    amountGiven,
    totalLoanAmount,
    interestAmount,
    interestPercentage,
    issuingDate,
  } = req.body;

  // Validate required fields
  if (
    !customerName ||
    !amountGiven ||
    !totalLoanAmount ||
    !interestAmount ||
    !interestPercentage ||
    !issuingDate
  ) {
    throw new ApiError(
      400,
      "All fields are required: customerName, amountGiven, totalLoanAmount, interestAmount, interestPercentage, issuingDate"
    );
  }

  // Validate numeric fields
  if (
    amountGiven <= 0 ||
    totalLoanAmount <= 0 ||
    interestAmount < 0 ||
    interestPercentage < 0
  ) {
    throw new ApiError(
      400,
      "Amount given and total loan amount must be positive, interest fields cannot be negative"
    );
  }

  // Validate and parse issuing date
  const parsedIssuingDate = new Date(issuingDate);
  if (isNaN(parsedIssuingDate.getTime())) {
    throw new ApiError(400, "Invalid issuing date format");
  }

  // Validate phone number format if provided
  if (phoneNumber && phoneNumber.length < 10) {
    throw new ApiError(400, "Phone number must be at least 10 digits");
  }

  // Generate next loan number
  const loanNumber = await getNextLoanNumber("monthly");

  // Create monthly loan object (without installments since months are variable)
  const monthlyLoanData = {
    loanNumber: loanNumber,
    name: customerName,
    phoneNumber: phoneNumber || null,
    loanAmount: totalLoanAmount,
    amountGiven: amountGiven,
    issuingDate: parsedIssuingDate,
    interestAmount: interestAmount,
    interestPercentage: interestPercentage,
    profitAmount: interestAmount, // For consistency with model schema
    collectedAmount: 0,
    remainingAmount: totalLoanAmount,
    installments: [], // Empty array since months are variable
    status: "active",
  };

  try {
    // Save to database
    const monthlyLoan = await Monthly.create(monthlyLoanData);

    return res
      .status(201)
      .json(
        new ApiResponse(201, monthlyLoan, "Monthly loan created successfully")
      );
  } catch (error) {
    // Handle duplicate phone number or other database errors
    if (error.code === 11000) {
      throw new ApiError(409, "A loan with this phone number already exists");
    }
    throw new ApiError(500, `Failed to create monthly loan: ${error.message}`);
  }
});

const getMonthlyLoans = asyncHandler(async (req, res) => {
  try {
    // Fetch all monthly loans from the database
    const monthlyLoans = await Monthly.find({}).sort({ createdAt: -1 }); // Sort by newest first

    // Check if any loans exist
    if (!monthlyLoans || monthlyLoans.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No monthly loans found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          monthlyLoans,
          `${monthlyLoans.length} monthly loans retrieved successfully`
        )
      );
  } catch (error) {
    throw new ApiError(500, `Failed to fetch monthly loans: ${error.message}`);
  }
});

const getMonthlyLoanById = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Validate ID format (basic MongoDB ObjectId validation)
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Find the monthly loan by ID
    const monthlyLoan = await Monthly.findById(id);

    // Check if loan exists
    if (!monthlyLoan) {
      throw new ApiError(404, "Monthly loan not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, monthlyLoan, "Monthly loan retrieved successfully")
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }

    if (error.name === "ApiError") {
      throw error;
    }

    throw new ApiError(500, `Failed to fetch monthly loan: ${error.message}`);
  }
});

const updateMonthlyInstallment = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Extract installments array from request body
    const { installments } = req.body;

    // Validate ID format
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Validate installments array
    if (
      !installments ||
      !Array.isArray(installments) ||
      installments.length === 0
    ) {
      throw new ApiError(
        400,
        "Installments array is required and must contain at least one installment"
      );
    }

    // Find the monthly loan
    const monthlyLoan = await Monthly.findById(id);
    if (!monthlyLoan) {
      throw new ApiError(404, "Monthly loan not found");
    }

    // Create a map of existing installments for quick lookup
    const existingInstallmentsMap = new Map();
    monthlyLoan.installments.forEach((inst) => {
      existingInstallmentsMap.set(inst.period, inst);
    });

    // Process all installments (both existing and new)
    const updatedInstallments = [];
    let newInstallmentsCount = 0;
    let updatedInstallmentsCount = 0;

    installments.forEach((installment, index) => {
      const { period, date, amount, status, paidOn } = installment;

      // Validate required fields for each installment
      if (!period || !date || !amount) {
        throw new ApiError(
          400,
          "Each installment must have period, date, and amount"
        );
      }

      // Validate status if provided
      if (status && !["paid", "missed", "pending"].includes(status)) {
        throw new ApiError(
          400,
          "Invalid installment status. Must be 'paid', 'missed', or 'pending'"
        );
      }

      // Validate amount
      if (amount <= 0) {
        throw new ApiError(400, "Installment amount must be positive");
      }

      // Parse date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new ApiError(400, `Invalid date format for period ${period}`);
      }

      // Check if this is an existing installment or a new one
      const existingInstallment = existingInstallmentsMap.get(period);

      if (existingInstallment) {
        // Update existing installment
        const updatedInstallment = {
          period: period,
          date: parsedDate,
          amount: amount,
          status: status || existingInstallment.status,
          paidOn:
            status === "paid" && paidOn
              ? new Date(paidOn)
              : status === "paid"
              ? new Date()
              : null, // Set to null when reverting from paid to pending/missed
        };
        updatedInstallments.push(updatedInstallment);
        updatedInstallmentsCount++;
      } else {
        // Add new installment
        const newInstallment = {
          period: period,
          date: parsedDate,
          amount: amount,
          status: status || "pending",
          paidOn:
            status === "paid" && paidOn
              ? new Date(paidOn)
              : status === "paid"
              ? new Date()
              : null,
        };
        updatedInstallments.push(newInstallment);
        newInstallmentsCount++;
      }
    });

    // Calculate total profit amount and collected amount based on paid installments
    let totalProfitAmount = monthlyLoan.interestAmount; // Start with base interest amount
    let collectedAmount = 0; // Start fresh calculation for installment amounts only

    // Calculate collected amount from all paid installments
    updatedInstallments.forEach((installment) => {
      if (installment.status === "paid") {
        totalProfitAmount += installment.amount; // Add monthly installment to profit
        collectedAmount += installment.amount; // Add monthly installment to collected amount
      }
    });

    // If loan is marked as paid, add the loan amount to collected amount
    if (monthlyLoan.collectedAmount >= monthlyLoan.loanAmount) {
      collectedAmount += monthlyLoan.loanAmount;
    }

    // Keep remaining amount unchanged (only updated when principal is paid back)
    const remainingAmount = monthlyLoan.remainingAmount;

    // Determine loan status: completed only if marked as paid AND all installments are paid
    const isAllInterestPaid = updatedInstallments.every(
      (inst) => inst.status === "paid"
    );
    const isMarkedAsPaid =
      monthlyLoan.collectedAmount >= monthlyLoan.loanAmount;

    // Only completed if marked as paid AND all installments are paid
    const loanStatus =
      isMarkedAsPaid && isAllInterestPaid ? "completed" : "active";

    const updateData = {
      installments: updatedInstallments,
      profitAmount: totalProfitAmount, // Update profit amount with paid installments
      collectedAmount: collectedAmount, // Update collected amount with paid installments
      remainingAmount: remainingAmount, // Keep existing remaining amount (unchanged)
      status: loanStatus,
    };

    // Update the loan
    const updatedLoan = await Monthly.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    const message =
      newInstallmentsCount > 0 && updatedInstallmentsCount > 0
        ? `${newInstallmentsCount} installments added, ${updatedInstallmentsCount} installments updated successfully`
        : newInstallmentsCount > 0
        ? `${newInstallmentsCount} installments added successfully`
        : `${updatedInstallmentsCount} installments updated successfully`;

    return res.status(200).json(new ApiResponse(200, updatedLoan, message));
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }

    if (error.name === "ApiError") {
      throw error;
    }

    throw new ApiError(500, `Failed to update installments: ${error.message}`);
  }
});

const deleteMonthlyInstallment = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID and installment period from URL parameters
    const { id, period } = req.params;

    // Validate ID format
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Validate period
    if (!period || isNaN(period)) {
      throw new ApiError(400, "Invalid installment period");
    }

    const installmentPeriod = parseInt(period);

    // Find the monthly loan
    const monthlyLoan = await Monthly.findById(id);
    if (!monthlyLoan) {
      throw new ApiError(404, "Monthly loan not found");
    }

    // Find the installment to delete
    const installmentIndex = monthlyLoan.installments.findIndex(
      (inst) => inst.period === installmentPeriod
    );

    if (installmentIndex === -1) {
      throw new ApiError(
        404,
        `Installment with period ${installmentPeriod} not found`
      );
    }

    // Remove the installment
    const updatedInstallments = monthlyLoan.installments.filter(
      (inst) => inst.period !== installmentPeriod
    );

    // Recalculate collected amount
    let collectedAmount = 0;
    updatedInstallments.forEach((installment) => {
      if (installment.status === "paid") {
        collectedAmount += installment.amount;
      }
    });

    // Calculate remaining amount
    const remainingAmount = monthlyLoan.loanAmount - collectedAmount;

    // Determine loan status: completed only if marked as paid AND all installments are paid
    const isAllInterestPaid = updatedInstallments.every(
      (inst) => inst.status === "paid"
    );
    const isMarkedAsPaid =
      monthlyLoan.collectedAmount === monthlyLoan.loanAmount;
    const loanStatus =
      isMarkedAsPaid && isAllInterestPaid ? "completed" : "active";

    // Update the loan
    const updatedLoan = await Monthly.findByIdAndUpdate(
      id,
      {
        installments: updatedInstallments,
        collectedAmount: collectedAmount,
        remainingAmount: remainingAmount,
        status: loanStatus,
      },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedLoan,
          `Installment period ${installmentPeriod} deleted successfully`
        )
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }

    if (error.name === "ApiError") {
      throw error;
    }

    throw new ApiError(500, `Failed to delete installment: ${error.message}`);
  }
});

const deleteMonthlyLoan = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Validate ID format (basic MongoDB ObjectId validation)
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Find and delete the monthly loan by ID
    const deletedLoan = await Monthly.findByIdAndDelete(id);

    // Check if loan existed
    if (!deletedLoan) {
      throw new ApiError(404, "Monthly loan not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { deletedLoan },
          "Monthly loan deleted successfully"
        )
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }

    if (error.name === "ApiError") {
      throw error;
    }

    throw new ApiError(500, `Failed to delete monthly loan: ${error.message}`);
  }
});

const markMonthlyLoanAsPaid = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Validate ID format
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Find the monthly loan

    const monthlyLoan = await Monthly.findById(id);

    if (!monthlyLoan) {
      throw new ApiError(404, "Monthly loan not found");
    }

    // Check if loan is already completed
    if (monthlyLoan.status === "completed") {
      throw new ApiError(400, "Loan is already marked as completed");
    }

    // Check if there are any unpaid installments (for logging purposes only)
    const unpaidInstallments = monthlyLoan.installments.filter(
      (inst) => inst.status !== "paid"
    );

    // Determine final status: completed only if marked as paid AND all interest installments are paid
    const allInstallmentsPaid = monthlyLoan.installments.every(
      (inst) => inst.status === "paid"
    );
    const wasAlreadyMarkedAsPaid =
      monthlyLoan.collectedAmount >= monthlyLoan.loanAmount;
    const finalStatus = allInstallmentsPaid ? "completed" : "active";

    // Update loan to mark as paid
    const updateData = {
      collectedAmount: monthlyLoan.collectedAmount + monthlyLoan.loanAmount, // Add loan amount to existing collected amount
      remainingAmount: 0,
      status: finalStatus, // Mark as completed only if all installments are paid
    };

    const updatedLoan = await Monthly.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedLoan,
          "Monthly loan marked as paid successfully"
        )
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }

    if (error.name === "ApiError") {
      throw error;
    }

    throw new ApiError(500, `Failed to mark loan as paid: ${error.message}`);
  }
});

export {
  createMonthlyLoan,
  getMonthlyLoans,
  getMonthlyLoanById,
  updateMonthlyInstallment,
  deleteMonthlyLoan,
  deleteMonthlyInstallment,
  markMonthlyLoanAsPaid,
};
