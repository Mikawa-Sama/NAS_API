import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { reply, replyError } from "./other";
import { z } from "zod";
import multer, { FileFilterCallback } from "multer";
import path from "path";


const JWT_SECRET = process.env.JWT_SECRET || "super_secure";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return replyError(res, 401, "Token manquant");

    const token = authHeader.split(" ")[1];
    try { 
        const payload = jwt.verify(token, JWT_SECRET) as any;
        req.user = {
            userId: payload.id,
            username: payload.username,
            password: ""
        };
        next();
    } catch (error) {
        return replyError(res, 403, "Token invalide ou expiré");
    }
};

/**
 * Creates a parser middleware for request body validation using Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware function
 */
export const parser = (schema: z.ZodSchema) => {
    return function createParser(req: Request, res: Response, next: NextFunction) {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            reply(res, 400, { error: result.error });
        } else {
            next();
        }
    };
};

/**
/**
 * This is a generic middleware placeholder for custom logic or logging.
 * You can implement any intermediate processing as needed using this pattern.
 */
export const upload = multer({ 
    dest: "tmpFile/",
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        const excludeExtensions = [".js", ".ts", ".php", ".exe", ".bat", ".sh", ".py"];
        const ext = path.extname(file.originalname).toLowerCase();

        if (excludeExtensions.includes(ext)) {
            cb(new Error(`Fichier de type ${ext} non autorisé`));
        } else {
            cb(null, true);
        }
    },
});