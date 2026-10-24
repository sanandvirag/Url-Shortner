import { ErrorRequestHandler } from "express";

export class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
    }
}

const getErrorStatus = (error: unknown): number | null => {
    if (typeof error === "object" && error !== null && "statusCode" in error) {
        const statusCode = (error as { statusCode?: unknown }).statusCode;
        return typeof statusCode === "number" ? statusCode : null;
    }

    if (typeof error === "object" && error !== null && "status" in error) {
        const status = (error as { status?: unknown }).status;
        return typeof status === "number" ? status : null;
    }

    return null;
};

const getErrorCode = (error: unknown): string | null => {
    if (typeof error === "object" && error !== null && "code" in error) {
        const code = (error as { code?: unknown }).code;
        return typeof code === "string" ? code : null;
    }

    return null;
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const statusCode = getErrorStatus(error);
    const errorCode = getErrorCode(error);

    if (errorCode === "P2002") {
        return res.status(409).json({
            message: "A resource with that value already exists",
        });
    }

    if (statusCode && statusCode >= 400 && statusCode < 500) {
        const message = error instanceof Error ? error.message : "Request failed";
        return res.status(statusCode).json({ message });
    }

    console.error("Unhandled request error", {
        method: req.method,
        path: req.originalUrl,
        error,
    });

    return res.status(500).json({
        message: process.env.NODE_ENV === "production"
            ? "Internal server error"
            : error instanceof Error ? error.message : "Internal server error",
    });
};
