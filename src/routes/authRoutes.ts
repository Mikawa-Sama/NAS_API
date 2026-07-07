import { Router } from "express";
import { disableMfa, enableMfa, getAccountAccessLogs, getCsrfToken, getDevices, login, logout, refreshTokenEndpoint, register, renameDevice, revokeDevice, setupMfa } from "../controllers/authController";
import { parser, rateLimit, verifyToken } from "../utils";
import { z } from "zod";

const router = Router();

const credentialsSchema = z.object({
    username: z.string()
        .trim()
        .min(3, "Le nom d'utilisateur doit faire au minimum 3 caracteres")
        .max(30, "Le nom d'utilisateur ne peut pas faire plus de 30 caracteres")
        .regex(/^[a-zA-Z0-9_.-]+$/, "Le nom d'utilisateur contient des caracteres interdits"),
    password: z.string()
        .min(12, "Le mot de passe doit faire au minimum 12 caracteres")
        .max(128, "Le mot de passe ne doit pas faire plus de 128 caracteres")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/,
            "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractere special"
        ),
});

const loginSchema = credentialsSchema.extend({
    deviceName: z.string()
        .trim()
        .min(1, "Le nom de l'appareil ne peut pas etre vide")
        .max(80, "Le nom de l'appareil ne peut pas faire plus de 80 caracteres")
        .optional(),
    totpCode: z.string()
        .regex(/^\d{6}$/, "Le code MFA doit contenir 6 chiffres")
        .optional(),
});

router.get("/csrf", getCsrfToken);
router.post("/register", rateLimit(5, 60 * 60 * 1000), parser(credentialsSchema), register);
router.post("/login", rateLimit(10, 15 * 60 * 1000), parser(loginSchema), login);
router.post("/logout", parser(z.object({
    refreshToken: z.string().min(1).optional()
})), logout);
router.post("/refresh", rateLimit(30, 15 * 60 * 1000), parser(z.object({
    token: z.string("Le refresh token est requis")
        .min(1, "Le refresh token est requis")
        .optional()
})), refreshTokenEndpoint);

router.get("/access-logs", verifyToken, getAccountAccessLogs);
router.post("/mfa/setup", verifyToken, setupMfa);
router.post("/mfa/enable", verifyToken, parser(z.object({
    code: z.string().regex(/^\d{6}$/, "Le code MFA doit contenir 6 chiffres"),
})), enableMfa);
router.post("/mfa/disable", verifyToken, parser(z.object({
    password: z.string().min(1, "Le mot de passe est requis"),
    code: z.string().regex(/^\d{6}$/, "Le code MFA doit contenir 6 chiffres").optional(),
})), disableMfa);
router.get("/devices", verifyToken, getDevices);
router.patch("/devices/:deviceId", verifyToken, parser(z.object({
    name: z.string()
        .trim()
        .min(1, "Le nom de l'appareil ne peut pas etre vide")
        .max(80, "Le nom de l'appareil ne peut pas faire plus de 80 caracteres"),
})), renameDevice);
router.delete("/devices/:deviceId", verifyToken, revokeDevice);

export default router;
