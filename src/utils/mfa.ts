import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import dotenv from "dotenv";

dotenv.config();

const getMasterKey = (): Buffer => {
    const masterKey = process.env.MASTER_KEY;
    if (!masterKey || masterKey.length < 32) {
        throw new Error("MASTER_KEY must be set and contain at least 32 characters");
    }

    return crypto.createHash("sha256").update(masterKey).digest();
};

export const encryptMfaSecret = (secret: string): string => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getMasterKey(), iv);
    const encryptedSecret = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encryptedSecret.toString("hex")}`;
};

export const decryptMfaSecret = (encryptedSecret: string): string => {
    const [ivHex, authTagHex, encryptedSecretHex] = encryptedSecret.split(":");
    if (!ivHex || !authTagHex || !encryptedSecretHex) {
        throw new Error("Invalid encrypted MFA secret");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", getMasterKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    return Buffer.concat([
        decipher.update(Buffer.from(encryptedSecretHex, "hex")),
        decipher.final(),
    ]).toString("utf8");
};

export const generateMfaSetup = async (username: string) => {
    const secret = generateSecret();
    const issuer = process.env.MFA_ISSUER || "NAS";
    const otpauthUrl = generateURI({ issuer, label: username, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, otpauthUrl, qrCodeDataUrl };
};

export const verifyMfaCode = (encryptedSecret: string, code: string): boolean => {
    const secret = decryptMfaSecret(encryptedSecret);
    const result = verifySync({ token: code, secret });
    return result.valid;
};
