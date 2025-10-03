import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { replyError } from "./src/utils"

const JWT_SECRET = process.env.JWT_SECRET || "super_secure";

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return replyError(res, 401, "Token manquant");

    const token = authHeader.split(" ")[1];
    try { 
        const payload = jwt.verify(token, JWT_SECRET) as any;
        req.user = payload;
        next();
    } catch (error) {
        return replyError(res, 403, "Token invalide ou expiré");
    }
};