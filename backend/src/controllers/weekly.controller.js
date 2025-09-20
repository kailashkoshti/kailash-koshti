import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Weekly } from "../models/weekly.model.js";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const createWeeklyLoan = asyncHandler(async (req, res) => {
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

  // Create weekly loan object (without installments since weeks are variable)
  const weeklyLoanData = {
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
    installments: [], // Empty array since weeks are variable
    status: "active",
  };

  try {
    // Save to database
    const weeklyLoan = await Weekly.create(weeklyLoanData);

    return res
      .status(201)
      .json(
        new ApiResponse(201, weeklyLoan, "Weekly loan created successfully")
      );
  } catch (error) {
    // Handle duplicate phone number or other database errors
    if (error.code === 11000) {
      throw new ApiError(409, "A loan with this phone number already exists");
    }
    throw new ApiError(500, `Failed to create weekly loan: ${error.message}`);
  }
});

const getWeeklyLoans = asyncHandler(async (req, res) => {
  try {
    // Fetch all weekly loans from the database
    const weeklyLoans = await Weekly.find({}).sort({ createdAt: -1 }); // Sort by newest first

    // Check if any loans exist
    if (!weeklyLoans || weeklyLoans.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No weekly loans found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          weeklyLoans,
          `${weeklyLoans.length} weekly loans retrieved successfully`
        )
      );
  } catch (error) {
    throw new ApiError(500, `Failed to fetch weekly loans: ${error.message}`);
  }
});

const getWeeklyLoanById = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Validate ID format (basic MongoDB ObjectId validation)
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Find the weekly loan by ID
    const weeklyLoan = await Weekly.findById(id);

    // Check if loan exists
    if (!weeklyLoan) {
      throw new ApiError(404, "Weekly loan not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, weeklyLoan, "Weekly loan retrieved successfully")
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }

    if (error.name === "ApiError") {
      throw error;
    }

    throw new ApiError(500, `Failed to fetch weekly loan: ${error.message}`);
  }
});

const updateWeeklyInstallment = asyncHandler(async (req, res) => {
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

    // Find the weekly loan
    const weeklyLoan = await Weekly.findById(id);
    if (!weeklyLoan) {
      throw new ApiError(404, "Weekly loan not found");
    }

    // Create a map of existing installments for quick lookup
    const existingInstallmentsMap = new Map();
    weeklyLoan.installments.forEach((inst) => {
      existingInstallmentsMap.set(inst.period, inst);
    });

    // Process all installments (both existing and new)
    const updatedInstallments = [];
    let newInstallmentsCount = 0;
    let updatedInstallmentsCount = 0;

    installments.forEach((installment) => {
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

    // Calculate total profit amount: base interest + paid installments
    let totalProfitAmount = weeklyLoan.interestAmount; // Start with base interest amount
    updatedInstallments.forEach((installment) => {
      if (installment.status === "paid") {
        totalProfitAmount += installment.amount; // Add weekly installment to profit
      }
    });

    // Keep existing collected amount and remaining amount unchanged
    // These will only be updated when customer pays back the full loan amount
    const collectedAmount = weeklyLoan.collectedAmount;
    const remainingAmount = weeklyLoan.remainingAmount;

    // Determine loan status: completed only if marked as paid AND all installments are paid
    // If new installments are added to a completed loan, make it active again
    const isAllInterestPaid = updatedInstallments.every(
      (inst) => inst.status === "paid"
    );
    const isMarkedAsPaid = weeklyLoan.collectedAmount === weeklyLoan.loanAmount;

    let loanStatus;
    if (newInstallmentsCount > 0) {
      // If new installments are added, always make it active
      loanStatus = "active";
    } else {
      // Only completed if marked as paid AND all installments are paid
      loanStatus = isMarkedAsPaid && isAllInterestPaid ? "completed" : "active";
    }

    const updateData = {
      installments: updatedInstallments,
      profitAmount: totalProfitAmount, // Update profit amount with paid installments
      collectedAmount: collectedAmount, // Keep existing collected amount
      remainingAmount: remainingAmount, // Keep existing remaining amount
      status: loanStatus,
    };

    // Update the loan
    const updatedLoan = await Weekly.findByIdAndUpdate(id, updateData, {
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

// const deleteWeeklyInstallment = asyncHandler(async (req, res) => {
//   try {
//     // Extract loan ID and installment period from URL parameters
//     const { id, period } = req.params;

//     // Validate ID format
//     if (!id || id.length !== 24) {
//       throw new ApiError(400, "Invalid loan ID format");
//     }

//     // Validate period
//     if (!period || isNaN(period)) {
//       throw new ApiError(400, "Invalid installment period");
//     }

//     const installmentPeriod = parseInt(period);

//     // Find the weekly loan
//     const weeklyLoan = await Weekly.findById(id);
//     if (!weeklyLoan) {
//       throw new ApiError(404, "Weekly loan not found");
//     }

//     // Find the installment to delete
//     const installmentIndex = weeklyLoan.installments.findIndex(
//       (inst) => inst.period === installmentPeriod
//     );

//     if (installmentIndex === -1) {
//       throw new ApiError(
//         404,
//         `Installment with period ${installmentPeriod} not found`
//       );
//     }

//     // Remove the installment
//     const updatedInstallments = weeklyLoan.installments.filter(
//       (inst) => inst.period !== installmentPeriod
//     );

//     // Recalculate collected amount
//     let collectedAmount = 0;
//     updatedInstallments.forEach((installment) => {
//       if (installment.status === "paid") {
//         collectedAmount += installment.amount;
//       }
//     });

//     // Calculate remaining amount
//     const remainingAmount = weeklyLoan.loanAmount - collectedAmount;

//     // Determine loan status
//     const loanStatus = remainingAmount <= 0 ? "completed" : "active";

//     // Update the loan
//     const updatedLoan = await Weekly.findByIdAndUpdate(
//       id,
//       {
//         installments: updatedInstallments,
//         collectedAmount: collectedAmount,
//         remainingAmount: remainingAmount,
//         status: loanStatus,
//       },
//       { new: true, runValidators: true }
//     );

//     return res
//       .status(200)
//       .json(
//         new ApiResponse(
//           200,
//           updatedLoan,
//           `Installment period ${installmentPeriod} deleted successfully`
//         )
//       );
//   } catch (error) {
//     // Handle specific MongoDB errors
//     if (error.name === "CastError") {
//       throw new ApiError(400, "Invalid loan ID format");
//     }
//     throw new ApiError(500, `Failed to delete installment: ${error.message}`);
//   }
// });

const markWeeklyLoanAsPaid = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Validate ID format (basic MongoDB ObjectId validation)
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Find the weekly loan by ID
    const weeklyLoan = await Weekly.findById(id);

    // Check if loan exists
    if (!weeklyLoan) {
      throw new ApiError(404, "Weekly loan not found");
    }

    // Check if loan is already completed
    if (weeklyLoan.status === "completed") {
      throw new ApiError(400, "Loan is already marked as completed");
    }

    // Check if there are any unpaid installments (for logging purposes only)
    const unpaidInstallments = weeklyLoan.installments.filter(
      (inst) => inst.status !== "paid"
    );

    // Determine final status: completed only if marked as paid AND all interest installments are paid
    const allInstallmentsPaid = weeklyLoan.installments.every(
      (inst) => inst.status === "paid"
    );
    const isMarkedAsPaid = weeklyLoan.loanAmount === weeklyLoan.loanAmount; // This will be true after update
    const finalStatus =
      isMarkedAsPaid && allInstallmentsPaid ? "completed" : "active";

    // Update the loan to mark as paid
    const updateData = {
      collectedAmount: weeklyLoan.loanAmount, // Set to total loan amount
      remainingAmount: 0, // Set to 0
      status: finalStatus, // Mark as completed only if all installments are paid
    };

    const updatedLoan = await Weekly.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedLoan,
          "Weekly loan marked as paid successfully"
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

    throw new ApiError(
      500,
      `Failed to mark weekly loan as paid: ${error.message}`
    );
  }
});

const deleteWeeklyLoan = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Validate ID format (basic MongoDB ObjectId validation)
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Find and delete the weekly loan by ID
    const deletedLoan = await Weekly.findByIdAndDelete(id);

    // Check if loan existed
    if (!deletedLoan) {
      throw new ApiError(404, "Weekly loan not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { deletedLoan },
          "Weekly loan deleted successfully"
        )
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }
    throw new ApiError(500, `Failed to delete weekly loan: ${error.message}`);
  }
});

export {
  createWeeklyLoan,
  getWeeklyLoans,
  getWeeklyLoanById,
  updateWeeklyInstallment,
  markWeeklyLoanAsPaid,
  deleteWeeklyLoan,
  // deleteWeeklyInstallment,
};
