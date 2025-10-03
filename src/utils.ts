import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import RefreshToken from "./models/RefreshTokens";

const JWT_SECRET = process.env.JWT_SECRET || "super_secure";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "very_secure";

/**
 * Utility function to send a JSON response with an HTTP status code.
 * @param {Response} res - Express response object.
 * @param {number} httpCode - HTTP status code.
 * @param {any} data - Data to send in the response.
 * @param {boolean} [success=true] - Indicates if the response is a success.
 * @returns {void}
 */
export const reply = <T>(res: Response, httpCode: number, data: T, success = true): void => {
    res.status(httpCode).json({ success, data });
};

/**
 * Utility function to send a JSON error response with an HTTP status code.
 * @param {Response} res - Express response object.
 * @param {number} [httpCode=500] - HTTP status code.
 * @param {string} [message="Server Error"] - Error message to send.
 * @returns {void}
 */
export const replyError = (res: Response, httpCode = 500, message = "Server Error"): void => {
    res.status(httpCode).json({ success: false, error: message });
};

/**
 * Generates a JWT access token for a user.
 * @param {number} userId - The user's ID.
 * @param {string} username - The username.
 * @returns {string} The signed JWT access token.
 */
export const generateAccessToken = (userId: number, username: string) => {
    return jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '4h' });
};

/**
 * Generates a JWT refresh token and saves it to the database.
 * @param {number} userId - The user's ID.
 * @returns {Promise<string>} The generated refresh token.
 */
export const generateRefreshToken = async (userId: number) => {
    const token = jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: "30d" });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await RefreshToken.create({ token, userId, expiresAt });
    return token
};

/**
 * Refreshes the access token from a valid refresh token.
 * @param {string} refreshToken - The refresh token to verify.
 * @returns {Promise<string|null>} The new access token or null if the refresh token is invalid.
 */
export const refreshAccessToken = async (refreshToken: string) => {
    const savedToken = await RefreshToken.findOne({ where: { token: refreshToken } });
    if (!savedToken) return null;

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET) as any;
        return generateAccessToken(payload.id, "");
    } catch (error) {
        await savedToken.destroy();
        return null;
    }
};