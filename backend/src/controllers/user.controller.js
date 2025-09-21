import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Daily } from "../models/daily.model.js";
import { Weekly } from "../models/weekly.model.js";
import { Monthly } from "../models/monthly.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const loginUser = asyncHandler(async (req, res) => {
  // Get username and password from request body
  const { username, password } = req.body;

  // Validate required fields
  if (!username || !password) {
    throw new ApiError(400, "Username and password are required");
  }

  // Find user in database
  const user = await User.findOne({ username });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Since you want to store password as-is, direct comparison
  if (user.password !== password) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Generate access token
  const accessToken = generateAccessToken(user._id);

  // Remove password from user object before sending response
  const loggedInUser = await User.findById(user._id).select("-password");

  // Set cookie options
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
        },
        "User logged in successfully"
      )
    );
});

const getDashboardData = asyncHandler(async (req, res) => {
  try {
    // Aggregate data from all loan types
    const [dailyLoans, weeklyLoans, monthlyLoans] = await Promise.all([
      Daily.find({}),
      Weekly.find({}),
      Monthly.find({}),
    ]);

    // Initialize totals
    let totalAmountGiven = 0;
    let totalAmountCollected = 0;
    let totalAmountRemaining = 0;
    let totalProfitAmount = 0;
    let totalLoanAmount = 0;

    // Process Daily Loans
    dailyLoans.forEach((loan) => {
      const amountGiven = loan.amountGiven || 0;
      const collectedAmount = loan.collectedAmount || 0;
      const remainingAmount = loan.remainingAmount || 0;
      const totalProfit = loan.totalProfit || 0; // Use totalProfit for daily loans
      const loanAmount = loan.loanAmount || 0;

      totalAmountGiven += amountGiven;
      totalAmountCollected += collectedAmount;
      totalAmountRemaining += remainingAmount;
      totalProfitAmount += totalProfit;
      totalLoanAmount += loanAmount;
    });

    // Process Weekly Loans
    weeklyLoans.forEach((loan) => {
      const amountGiven = loan.amountGiven || 0;
      const collectedAmount = loan.collectedAmount || 0;
      const remainingAmount = loan.remainingAmount || 0;
      const profitAmount = loan.profitAmount || 0;
      const loanAmount = loan.loanAmount || 0;

      totalAmountGiven += amountGiven;
      totalAmountCollected += collectedAmount;
      totalAmountRemaining += remainingAmount;
      totalProfitAmount += profitAmount;
      totalLoanAmount += loanAmount;
    });

    // Process Monthly Loans
    monthlyLoans.forEach((loan) => {
      const amountGiven = loan.amountGiven || 0;
      const collectedAmount = loan.collectedAmount || 0;
      const remainingAmount = loan.remainingAmount || 0;
      const profitAmount = loan.profitAmount || 0;
      const loanAmount = loan.loanAmount || 0;

      totalAmountGiven += amountGiven;
      totalAmountCollected += collectedAmount;
      totalAmountRemaining += remainingAmount;
      totalProfitAmount += profitAmount;
      totalLoanAmount += loanAmount;
    });

    // Prepare dashboard data with 5 essential metrics
    const dashboardData = {
      totalAmountGiven: totalAmountGiven,
      totalAmountCollected: totalAmountCollected,
      totalAmountRemaining: totalAmountRemaining,
      totalProfitAmount: totalProfitAmount,
      totalLoanAmount: totalLoanAmount,
    };

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          dashboardData,
          "Dashboard data retrieved successfully"
        )
      );
  } catch (error) {
    throw new ApiError(500, `Failed to fetch dashboard data: ${error.message}`);
  }
});

export { loginUser, getDashboardData };
