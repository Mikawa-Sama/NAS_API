import { Router } from "express";
import { login, logout, refreshTokenEndpoint, register } from "../controllers/authController";
import { parser, verifyToken } from "../utils"
import { z } from "zod";

const router = Router();

router.post('/register', parser(z.object({
    username: z.string()
        .min(3, "Le nom d'utilisateur doit faire au minimum 3 caractères")
        .max(30, "Le nom d'utilisateur ne peux pas faire plus de 30 caractères"),
    password: z.string()
        .min(8, "Le mot de passe doit faire au minimum 8 caractères")
        .max(100, "Le mot de passe ne doit pas faire plus de 100 caractères")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/,
            "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"
        ),
})), register);

router.post('/login', parser(z.object({
    username: z.string()
        .min(3, "Le nom d'utilisateur doit faire au minimum 3 caractères")
        .max(30, "Le nom d'utilisateur ne peux pas faire plus de 30 caractères"),
    password: z.string()
        .min(8, "Le mot de passe doit faire au minimum 8 caractères")
        .max(100, "Le mot de passe ne doit pas faire plus de 100 caractères")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/,
            "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"
        ),
})), login);

router.post('/logout', verifyToken, logout);

router.post('/refresh', verifyToken, refreshTokenEndpoint);

export default router;