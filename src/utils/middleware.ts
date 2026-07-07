import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { reply, replyError } from "./other";
import { z } from "zod";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { User, UserDevice } from "../models";
import { jwtSecret, jwtVerifyOptions, refreshSecret } from "./token";

const DEFAULT_MAX_UPLOAD_SIZE = 50 * 1024 * 1024;
const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE || DEFAULT_MAX_UPLOAD_SIZE);
const TMP_UPLOAD_DIR = process.env.TMP_UPLOAD_DIR || "tmpFile";
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "x-csrf-token";
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdir(TMP_UPLOAD_DIR, { recursive: true }, (error) => cb(error, TMP_UPLOAD_DIR));
    },
    filename: (req, file, cb) => {
        cb(null, crypto.randomUUID());
    },
});

const getClientIp = (req: Request): string => {
    return req.ip || req.socket.remoteAddress || "unknown";
};

const getCookieValue = (req: Request, name: string): string | null => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));
    if (!cookie) return null;

    return decodeURIComponent(cookie.slice(name.length + 1));
};

const signCsrfNonce = (nonce: string): string => {
    return crypto.createHmac("sha256", refreshSecret).update(nonce).digest("hex");
};

export const createCsrfToken = (): string => {
    const nonce = crypto.randomBytes(32).toString("base64url");
    return `${nonce}.${signCsrfNonce(nonce)}`;
};

export const isValidCsrfToken = (token: string): boolean => {
    const [nonce, signature] = token.split(".");
    if (!nonce || !signature) return false;

    const expectedSignature = signCsrfNonce(nonce);
    if (signature.length !== expectedSignature.length) return false;

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};

export const csrfCookieOptions = () => {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `SameSite=Strict; Path=/; Max-Age=${24 * 60 * 60}${secure}`;
};

export const setCsrfCookie = (res: Response, token = createCsrfToken()): string => {
    res.setHeader("Set-Cookie", `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; ${csrfCookieOptions()}`);
    return token;
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cache-Control", "no-store");
    next();
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    const cookieToken = getCookieValue(req, CSRF_COOKIE_NAME);
    const headerToken = req.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken || !isValidCsrfToken(headerToken)) {
        return replyError(res, 403, "Token CSRF invalide");
    }

    return next();
};

export const rateLimit = (limit: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = crypto.createHash("sha256").update(`${getClientIp(req)}:${req.path}`).digest("hex");
        const now = Date.now();
        const bucket = rateLimitBuckets.get(key);

        if (!bucket || bucket.resetAt <= now) {
            rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (bucket.count >= limit) {
            return replyError(res, 429, "Trop de tentatives, reessayez plus tard");
        }

        bucket.count += 1;
        return next();
    };
};

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return replyError(res, 401, "Token manquant");

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return replyError(res, 401, "Token invalide");

    try {
        const payload = jwt.verify(token, jwtSecret, jwtVerifyOptions) as any;
        if (!payload.deviceId) return replyError(res, 401, "Token invalide");

        const user = await User.findByPk(payload.id);
        if (!user) return replyError(res, 401, "Token invalide");

        const device = await UserDevice.findOne({
            where: {
                deviceId: payload.deviceId,
                userId: user.userId,
            }
        });
        if (!device || device.revokedAt) return replyError(res, 401, "Session revoquee");
        await device.update({
            lastIpAddress: getClientIp(req),
            lastUsedAt: new Date(),
        });

        req.user = {
            userId: user.userId,
            username: user.username,
            password: "",
            isAdmin: user.isAdmin,
            mfaEnabled: user.mfaEnabled,
            mfaSecret: null,
        };
        req.deviceId = device.deviceId;
        next();
    } catch (error) {
        return replyError(res, 403, "Token invalide ou expire");
    }
};

export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.isAdmin) return replyError(res, 403, "Acces admin requis");
    next();
};

export const parser = (schema: z.ZodSchema) => {
    return function createParser(req: Request, res: Response, next: NextFunction) {
        const result = schema.safeParse(req.body ?? {});
        if (!result.success) {
            reply(res, 400, { error: result.error });
        } else {
            req.body = result.data;
            next();
        }
    };
};

export const upload = multer({
    storage: uploadStorage,
    limits: {
        fileSize: MAX_UPLOAD_SIZE,
        files: 1,
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const excludeExtensions = [".js", ".ts", ".php", ".exe", ".bat", ".sh", ".py", ".ps1", ".cmd", ".com", ".msi", ".scr", ".jar"];
        const ext = path.extname(file.originalname).toLowerCase();

        if (excludeExtensions.includes(ext)) {
            cb(new Error(`Fichier de type ${ext} non autorise`));
        } else {
            cb(null, true);
        }
    },
});
