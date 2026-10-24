import "dotenv/config";
import express from "express";
import cors from "cors";
import urlRoutes from "./routes/url_routes";
import authRoutes from "./routes/auth_routes";
import cookieParser from "cookie-parser";
import { errorHandler, HttpError } from "./middlewares/error_handler";

const app = express();

app.use(cors({origin: process.env.FRONTEND_URL || "http://localhost:5173",credentials: true}));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({message: "URL Shortener API is running"});
});

app.use("/api/urls", urlRoutes);
app.use("/api/auth", authRoutes);
app.use((_req, _res, next) => {
  next(new HttpError(404, "Route not found"));
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});