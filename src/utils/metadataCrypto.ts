import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const ENCRYPTED_PREFIX = "enc:";

const getMetadataKey = (): Buffer => {
    const masterKey = process.env.MASTER_KEY;
    if (!masterKey || masterKey.length < 32) {
        throw new Error("MASTER_KEY must be set and contain at least 32 characters");
    }

    return crypto.createHash("sha256").update(`metadata:${masterKey}`).digest();
};

export const encryptMetadata = (value?: string | null): string | null => {
    if (!value) return null;
    if (value.startsWith(ENCRYPTED_PREFIX)) return value;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getMetadataKey(), iv);
    const encryptedValue = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${ENCRYPTED_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encryptedValue.toString("hex")}`;
};

export const decryptMetadata = (value?: string | null): string | null => {
    if (!value) return null;
    if (!value.startsWith(ENCRYPTED_PREFIX)) return value;

    const encryptedPayload = value.slice(ENCRYPTED_PREFIX.length);
    const [ivHex, authTagHex, encryptedValueHex] = encryptedPayload.split(":");
    if (!ivHex || !authTagHex || !encryptedValueHex) {
        throw new Error("Invalid encrypted metadata");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", getMetadataKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    return Buffer.concat([
        decipher.update(Buffer.from(encryptedValueHex, "hex")),
        decipher.final(),
    ]).toString("utf8");
};
