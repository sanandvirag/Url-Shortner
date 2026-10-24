import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./error_handler";

export interface AuthRequest<
    P = Record<string, string>
> extends Request<P> {
    userId?: string;
}

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return next(new HttpError(401, "Authentication required"));
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return next(new HttpError(500, "Authentication is not configured"));
        }

        const decoded = jwt.verify(token, jwtSecret);
        if (typeof decoded === "string" || typeof decoded.userId !== "string") {
            return next(new HttpError(401, "Invalid or expired token"));
        }

        req.userId = decoded.userId;

        next();

    } catch {
        return next(new HttpError(401, "Invalid or expired token"));
    }
};