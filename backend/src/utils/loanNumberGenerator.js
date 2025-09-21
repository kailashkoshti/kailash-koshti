import { Daily } from "../models/daily.model.js";
import { Weekly } from "../models/weekly.model.js";
import { Monthly } from "../models/monthly.model.js";

/**
 * Generate the next loan number for a specific loan type
 * @param {string} loanType - 'daily', 'weekly', or 'monthly'
 * @returns {Promise<number>} - The next loan number
 */
export const getNextLoanNumber = async (loanType) => {
  try {
    let Model;
    switch (loanType.toLowerCase()) {
      case "daily":
        Model = Daily;
        break;
      case "weekly":
        Model = Weekly;
        break;
      case "monthly":
        Model = Monthly;
        break;
      default:
        throw new Error(`Invalid loan type: ${loanType}`);
    }

    // Find the highest loan number for this loan type
    const lastLoan = await Model.findOne({}, { loanNumber: 1 })
      .sort({ loanNumber: -1 })
      .lean();

    // If no loans exist, start from 1, otherwise increment the highest number
    const nextNumber = lastLoan ? lastLoan.loanNumber + 1 : 1;

    return nextNumber;
  } catch (error) {
    console.error(`Error generating loan number for ${loanType}:`, error);
    throw error;
  }
};
