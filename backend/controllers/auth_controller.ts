import { NextFunction, Request, Response } from "express";
import { registerUser, loginUser  } from "../services/auth_service";
import { HttpError } from "../middlewares/error_handler";

const normalizeEmail = (value: unknown): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const email = value.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email: rawEmail, password } = req.body;
        const email = normalizeEmail(rawEmail);

        if (!email || typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                message: "A valid email and a password of at least 8 characters are required"
            });
        }

        const user = await registerUser(email, password);

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        if (error instanceof Error && error.message === "User already exists") {
            return next(new HttpError(409, "User already exists"));
        }

        return next(error);
    }
};


export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email: rawEmail, password } = req.body;
        const email = normalizeEmail(rawEmail);

        if (!email || typeof password !== "string" || !password) {
            return res.status(400).json({
                message: "A valid email and password are required"
            });
        }

        const { user, token } = await loginUser(email, password);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            message: "Login successful",
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        if (error instanceof Error && error.message === "Invalid credentials") {
            return next(new HttpError(401, "Invalid email or password"));
        }

        return next(error);
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    return res.status(204).send();
};