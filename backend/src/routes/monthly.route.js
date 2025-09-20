import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createMonthlyLoan,
  getMonthlyLoans,
  getMonthlyLoanById,
  updateMonthlyInstallment,
  deleteMonthlyLoan,
  deleteMonthlyInstallment,
  markMonthlyLoanAsPaid,
} from "../controllers/monthly.controller.js";

const router = Router();

router.route("/").post(verifyJWT, createMonthlyLoan);
router.route("/").get(verifyJWT, getMonthlyLoans);
router.route("/:id").get(verifyJWT, getMonthlyLoanById);
router.route("/:id").delete(verifyJWT, deleteMonthlyLoan);
router.route("/:id/installments").patch(verifyJWT, updateMonthlyInstallment);
router.route("/:id/mark-paid").patch(verifyJWT, markMonthlyLoanAsPaid);
router
  .route("/:id/installments/:installmentId")
  .delete(verifyJWT, deleteMonthlyInstallment);

export default router;
