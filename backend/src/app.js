import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.route.js";
import dotenv from "dotenv";
import dailyRouter from "./routes/daily.route.js";
import weeklyRouter from "./routes/weekly.route.js";
import monthlyRouter from "./routes/monthly.route.js";

dotenv.config({
  path: "./.env",
});

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).send("Hello World");
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/daily", dailyRouter);
app.use("/api/v1/weekly", weeklyRouter);
app.use("/api/v1/monthly", monthlyRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.name === "ApiError") {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode || 500,
    });
  }

  // Handle other types of errors
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    statusCode: 500,
  });
});

export { app };
