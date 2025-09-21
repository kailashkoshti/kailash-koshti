import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Daily } from "../models/daily.model.js";
import { getNextLoanNumber } from "../utils/loanNumberGenerator.js";

const createDailyLoan = asyncHandler(async (req, res) => {
  // Extract data from request body
  const {
    customerName,
    phoneNumber,
    amountGiven,
    expectedProfit,
    profitPercentage,
    totalLoanAmount,
    numberOfDays,
    amountPerDay,
    issuingDate,
  } = req.body;

  if (
    !customerName ||
    !amountGiven ||
    !expectedProfit ||
    !profitPercentage ||
    !totalLoanAmount ||
    !numberOfDays ||
    !amountPerDay ||
    !issuingDate
  ) {
    throw new ApiError(
      400,
      "All fields are required: customerName, amountGiven, expectedProfit, profitPercentage, totalLoanAmount, numberOfDays, amountPerDay, issuingDate"
    );
  }

  // Validate phone number if provided (must be exactly 10 digits)
  if (phoneNumber && phoneNumber.trim()) {
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      throw new ApiError(400, "Phone number must be exactly 10 digits");
    }
  } else {
  }

  // Validate and parse issuing date
  const parsedIssuingDate = new Date(issuingDate);
  if (isNaN(parsedIssuingDate.getTime())) {
    throw new ApiError(400, "Invalid issuing date format");
  }

  // Create installments array
  const installments = [];
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

  for (let i = 1; i <= numberOfDays; i++) {
    const installmentDate = new Date(parsedIssuingDate);
    installmentDate.setDate(installmentDate.getDate() + i);
    installmentDate.setHours(0, 0, 0, 0); // Set to start of day

    // All installments start as pending regardless of date
    let installmentStatus = "pending";

    installments.push({
      period: i,
      date: installmentDate,
      amount: amountPerDay,
      status: installmentStatus,
      paidOn: null,
    });
  }

  // Generate next loan number
  const loanNumber = await getNextLoanNumber("daily");

  // Create daily loan object
  const dailyLoanData = {
    loanNumber: loanNumber,
    name: customerName,
    phoneNumber: phoneNumber,
    loanAmount: totalLoanAmount,
    amountGiven: amountGiven,
    issuingDate: parsedIssuingDate,
    expectedProfit: expectedProfit,
    totalProfit: 0, // Initially 0 since collectedAmount is 0
    profitPercentage: profitPercentage,
    numberOfDays: numberOfDays,
    amountPerDay: amountPerDay,
    collectedAmount: 0,
    remainingAmount: totalLoanAmount,
    status: "active",
    installments: installments,
  };

  try {
    // Save to database
    const dailyLoan = await Daily.create(dailyLoanData);

    return res
      .status(201)
      .json(new ApiResponse(201, dailyLoan, "Daily loan created successfully"));
  } catch (error) {
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern["installments.period"]) {
        throw new ApiError(
          500,
          "Database schema error. Please contact support."
        );
      } else {
        throw new ApiError(409, "A loan with this phone number already exists");
      }
    }
    throw new ApiError(500, `Failed to create daily loan: ${error.message}`);
  }
});

const getDailyLoans = asyncHandler(async (req, res) => {
  try {
    // Fetch all daily loans from the database
    const dailyLoans = await Daily.find({}).sort({ createdAt: -1 }); // Sort by newest first

    // Check if any loans exist
    if (!dailyLoans || dailyLoans.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [], "No daily loans found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          dailyLoans,
          `${dailyLoans.length} daily loans retrieved successfully`
        )
      );
  } catch (error) {
    throw new ApiError(500, `Failed to fetch daily loans: ${error.message}`);
  }
});

const getDailyLoanById = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Validate ID format (basic MongoDB ObjectId validation)
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Find the daily loan by ID
    const dailyLoan = await Daily.findById(id);

    // Check if loan exists
    if (!dailyLoan) {
      throw new ApiError(404, "Daily loan not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, dailyLoan, "Daily loan retrieved successfully")
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }
    throw new ApiError(500, `Failed to fetch daily loan: ${error.message}`);
  }
});

const updateDailyInstallment = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Extract installments array from request body
    const { installments } = req.body;

    // Validate ID format
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Validate installments array - now it can be empty for reverting
    if (!installments || !Array.isArray(installments)) {
      throw new ApiError(400, "Installments array is required");
    }

    // Find the daily loan
    const dailyLoan = await Daily.findById(id);
    if (!dailyLoan) {
      throw new ApiError(404, "Daily loan not found");
    }

    // Process all installments - frontend now sends all installments with their desired status
    let collectedAmount = 0;
    const updatedInstallments = [...dailyLoan.installments];

    // Create a map of updates for quick lookup
    const installmentUpdates = new Map();

    installments.forEach((updateInstallment) => {
      const { period, status, paidOn } = updateInstallment;

      // Validate required fields for each installment
      if (!period || !status) {
        throw new ApiError(400, "Each installment must have period and status");
      }

      // Validate status
      if (!["paid", "pending"].includes(status)) {
        throw new ApiError(
          400,
          "Invalid installment status. Must be 'paid' or 'pending'"
        );
      }

      installmentUpdates.set(period, { status, paidOn });
    });

    // Update all installments based on the received updates
    updatedInstallments.forEach((installment, index) => {
      const period = installment.period;
      const update = installmentUpdates.get(period);

      if (update) {
        installment.status = update.status;

        if (update.status === "paid") {
          const paidOnDate = update.paidOn
            ? new Date(update.paidOn)
            : new Date();

          installment.paidOn = paidOnDate;
        } else {
          installment.paidOn = null;
        }
      } else {
      }
    });

    // Calculate total collected amount

    updatedInstallments.forEach((installment) => {
      if (installment.status === "paid") {
        collectedAmount += installment.amount;
      }
    });

    // Calculate remaining amount
    const remainingAmount = dailyLoan.loanAmount - collectedAmount;

    // Calculate total profit (collectedAmount - amountGiven, if positive, else 0)
    const totalProfit = Math.max(0, collectedAmount - dailyLoan.amountGiven);

    // Determine loan status
    const loanStatus = remainingAmount <= 0 ? "completed" : "active";

    // Update the loan
    const updatedLoan = await Daily.findByIdAndUpdate(
      id,
      {
        installments: updatedInstallments,
        collectedAmount: collectedAmount,
        remainingAmount: remainingAmount,
        totalProfit: totalProfit,
        status: loanStatus,
      },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedLoan, "Installments updated successfully")
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }
    throw new ApiError(500, `Failed to update installments: ${error.message}`);
  }
});

const deleteDailyLoan = asyncHandler(async (req, res) => {
  try {
    // Extract loan ID from URL parameters
    const { id } = req.params;

    // Validate ID format (basic MongoDB ObjectId validation)
    if (!id || id.length !== 24) {
      throw new ApiError(400, "Invalid loan ID format");
    }

    // Find and delete the daily loan by ID
    const deletedLoan = await Daily.findByIdAndDelete(id);

    // Check if loan existed
    if (!deletedLoan) {
      throw new ApiError(404, "Daily loan not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { deletedLoan }, "Daily loan deleted successfully")
      );
  } catch (error) {
    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      throw new ApiError(400, "Invalid loan ID format");
    }
    throw new ApiError(500, `Failed to delete daily loan: ${error.message}`);
  }
});

export {
  createDailyLoan,
  getDailyLoans,
  getDailyLoanById,
  updateDailyInstallment,
  deleteDailyLoan,
};
