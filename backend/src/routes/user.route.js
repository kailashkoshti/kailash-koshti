import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { loginUser, getDashboardData } from "../controllers/user.controller.js";

const router = Router();

router.route("/login").post(loginUser);
router.route("/dashboard").get(verifyJWT, getDashboardData);

export default router;
