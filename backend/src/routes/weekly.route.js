import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createWeeklyLoan,
  getWeeklyLoans,
  getWeeklyLoanById,
  updateWeeklyInstallment,
  markWeeklyLoanAsPaid,
  deleteWeeklyLoan,
  // deleteWeeklyInstallment,
} from "../controllers/weekly.controller.js";

const router = Router();

router.route("/").post(verifyJWT, createWeeklyLoan);
router.route("/").get(verifyJWT, getWeeklyLoans);
router.route("/:id").get(verifyJWT, getWeeklyLoanById);
router.route("/:id").delete(verifyJWT, deleteWeeklyLoan);
router.route("/:id/mark-paid").patch(verifyJWT, markWeeklyLoanAsPaid);
router.route("/:id/installments").patch(verifyJWT, updateWeeklyInstallment);
router.route("/:id/installments/:installmentId");
// .delete(verifyJWT, deleteWeeklyInstallment);

export default router;
