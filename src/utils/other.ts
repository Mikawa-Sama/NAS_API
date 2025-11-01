import { Request, Response } from "express";

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

