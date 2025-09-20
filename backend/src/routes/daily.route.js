import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createDailyLoan,
  getDailyLoans,
  getDailyLoanById,
  updateDailyInstallment,
} from "../controllers/daily.controller.js";
import { deleteDailyLoan } from "../controllers/daily.controller.js";

const router = Router();

router.route("/").post(verifyJWT, createDailyLoan);
router.route("/").get(verifyJWT, getDailyLoans);
router.route("/:id").get(verifyJWT, getDailyLoanById);
router.route("/:id").delete(verifyJWT, deleteDailyLoan);
router.route("/:id/installments").patch(verifyJWT, updateDailyInstallment);

export default router;
