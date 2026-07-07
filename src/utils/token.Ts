import crypto from "crypto";
import jwt from "jsonwebtoken";
import { RefreshToken, User, UserDevice } from "../models";
import dotenv from "dotenv";

dotenv.config();

const JWT_ISSUER = process.env.JWT_ISSUER || "nas-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "nas-web";

const assertSecret = (name: string, value: string | undefined): string => {
    if (!value || value.length < 32) {
        throw new Error(`${name} must be set and contain at least 32 characters`);
    }

    return value;
};

export const jwtSecret = assertSecret("JWT_SECRET", process.env.JWT_SECRET);
export const refreshSecret = assertSecret("REFRESH_SECRET", process.env.REFRESH_SECRET);

export const jwtVerifyOptions = {
    algorithms: ["HS256"] as jwt.Algorithm[],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
};

export const hashRefreshToken = (refreshToken: string): string => {
    return crypto.createHmac("sha256", refreshSecret).update(refreshToken).digest("hex");
};

export const generateAccessToken = (userId: number, username: string, deviceId: number) => {
    return jwt.sign(
        { id: userId, username, deviceId },
        jwtSecret,
        {
            algorithm: "HS256",
            audience: JWT_AUDIENCE,
            expiresIn: "15m",
            issuer: JWT_ISSUER,
        }
    );
};

export const generateRefreshToken = async (userId: number, deviceId: number) => {
    const token = crypto.randomBytes(64).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshToken.create({ token: hashRefreshToken(token), userId, deviceId, expiresAt });
    return token;
};

export const refreshAccessToken = async (refreshToken: string) => {
    const savedToken = await RefreshToken.findOne({ where: { token: hashRefreshToken(refreshToken) } });
    if (!savedToken) return null;

    if (savedToken.expiresAt.getTime() <= Date.now()) {
        await savedToken.destroy();
        return null;
    }

    const user = await User.findByPk(savedToken.userId);
    const device = await UserDevice.findByPk(savedToken.deviceId);
    if (!user) {
        await savedToken.destroy();
        return null;
    }
    if (!device || device.revokedAt) {
        await savedToken.destroy();
        return null;
    }

    await savedToken.destroy();
    await device.update({ lastUsedAt: new Date() });

    return {
        accessToken: generateAccessToken(user.userId, user.username, device.deviceId),
        refreshToken: await generateRefreshToken(user.userId, device.deviceId),
        userId: user.userId,
        username: user.username,
        deviceId: device.deviceId,
    };
};
