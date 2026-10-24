import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./error_handler";

export interface OptionalAuthRequest extends Request {
    userId?: string;
}

export const optionalAuth = (
    req: OptionalAuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return next();
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return next(new HttpError(500, "Authentication is not configured"));
        }

        const decoded = jwt.verify(token, jwtSecret);
        if (typeof decoded === "string" || typeof decoded.userId !== "string") {
            return next();
        }

        req.userId = decoded.userId;

        next();

    } catch (error) {
        // Invalid/expired token → treat request as guest
        next();
    }
};