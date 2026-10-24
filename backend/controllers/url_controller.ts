import { NextFunction, Request, Response } from "express";
import { createShortUrl, deleteShortUrl, updateUrlExpiry, getUserAnalytics } from "../services/url_service";
import { AuthRequest } from "../middlewares/auth_middleware";
import { HttpError } from "../middlewares/error_handler";
import { prisma } from "../lib/prisma";

const getExpiryDate = (value: unknown): Date | null => {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const expiryDate = new Date(value);
    if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
        return null;
    }

    return expiryDate;
};

const getShortUrl = (req: Request, shortCode: string): string => {
    const configuredBaseUrl = process.env.BASE_URL?.replace(/\/$/, "") ||
        `${req.protocol}://${req.get("host")}`;
    const redirectBaseUrl = configuredBaseUrl.endsWith("/api/urls")
        ? configuredBaseUrl
        : `${configuredBaseUrl}/api/urls`;

    return `${redirectBaseUrl}/${shortCode}`;
};

export const createShortUrlController = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { originalUrl, expiresAt, customAlias: rawAlias } = req.body;
        const customAlias = typeof rawAlias === "string" ? rawAlias.trim().toLowerCase() : null;

        if (typeof originalUrl !== "string" || !originalUrl.trim()) {
            return res.status(400).json({
                message: "Original URL is required",
            });
        }

        try {
            const parsedUrl = new URL(originalUrl);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                throw new Error();
            }
        } catch {
            return res.status(400).json({
                message: "A valid HTTP or HTTPS URL is required",
            });
        }

        if (expiresAt !== undefined && expiresAt !== null && !getExpiryDate(expiresAt)) {
            return res.status(400).json({
                message: "expiresAt must be a valid future date",
            });
        }

        if (customAlias === "analytics") {
            return res.status(400).json({
                message: "This custom alias is reserved",
            });
        }

        if (customAlias && !/^[a-z0-9_-]{3,32}$/.test(customAlias)) {
            return res.status(400).json({
                message: "Custom alias must be 3-32 characters using letters, numbers, hyphens, or underscores",
            });
        }

        const url = await createShortUrl({
            originalUrl: originalUrl.trim(),
            expiresAt,
            userId: req.userId,
            customAlias,
        });

        const publicCode = url.customAlias || url.shortCode;

        return res.status(201).json({
            message: "URL shortened successfully",
            shortCode: publicCode,
            customAlias: url.customAlias,
            shortUrl: getShortUrl(req, publicCode),
            originalUrl: url.originalUrl,
            expiresAt: url.expiresAt,
        });

    } catch (error) {
        if (error instanceof Error && error.message === "Custom alias already exists") {
            return next(new HttpError(409, "Custom alias already exists"));
        }

        return next(error);
    }
};

export const redirectUrl = async (
    req: Request<{ shortCode: string }>,
    res: Response,
    next: NextFunction
) => {
    try {
        const { shortCode } = req.params;

        let url = await prisma.url.findUnique({
            where: { shortCode },
            select: {
                id: true,
                originalUrl: true,
                expiresAt: true,
            },
        });

        if (!url) {
            url = await prisma.url.findUnique({
                where: { customAlias: shortCode },
                select: {
                    id: true,
                    originalUrl: true,
                    expiresAt: true,
                },
            });
        }

        if (!url) {
            return res.status(404).json({
                message: "Short URL not found"
            });
        }

        if (url.expiresAt && url.expiresAt < new Date()) {
            return res.status(410).json({
                message: "Short URL has expired"
            });
        }

        const referer = req.get("Referer") || null;

        void prisma.click.create({
            data: {
                urlId: url.id,
                referer,
                ipAddress: req.ip,
                userAgent: req.get("User-Agent") || null
            }
        }).catch((error) => console.error("Failed to record click", error));

        return res.redirect(url.originalUrl);

    } catch (error) {
        return next(error);
    }
};

export const updateUrlExpiryController = async (
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
) => {
    try {
        const { id } = req.params;
        const { expiresAt } = req.body;

        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        if (expiresAt === undefined) {
            return res.status(400).json({
                message: "expiresAt is required",
            });
        }

        if (expiresAt !== null && !getExpiryDate(expiresAt)) {
            return res.status(400).json({
                message: "expiresAt must be a valid future date or null",
            });
        }

        const updatedUrl = await updateUrlExpiry(
            id,
            req.userId,
            expiresAt
        );

        return res.status(200).json({
            message: "URL expiry updated successfully",
            url: updatedUrl,
        });

    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "URL not found or unauthorized"
        ) {
            return next(new HttpError(404, "URL not found or you are not the owner"));
        }

        return next(error);
    }
};

export const deleteShortUrlController = async (
    req: AuthRequest<{ id: string }>,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({
                message: "URL id is required",
            });
        }

        await deleteShortUrl(id, req.userId);

        return res.status(204).send();
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "URL not found or unauthorized"
        ) {
            return next(new HttpError(404, "URL not found or you are not the owner"));
        }

        return next(error);
    }
};

export const getUserAnalyticsController = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const requestedLimit = Number(req.query.limit ?? 100);
        const requestedOffset = Number(req.query.offset ?? 0);
        const limit = Number.isInteger(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), 100)
            : 100;
        const offset = Number.isInteger(requestedOffset)
            ? Math.max(requestedOffset, 0)
            : 0;

        const analytics = await getUserAnalytics(req.userId, { limit, offset });

        return res.status(200).json(analytics);

    } catch (error) {
        return next(error);
    }
};