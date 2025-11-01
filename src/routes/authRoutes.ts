import { Router } from "express";
import { login, logout, refreshTokenEndpoint, register } from "../controllers/authController";
import { parser } from "../utils"
import { z } from "zod";

const router = Router();

router.post('/register', register);
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
router.post('/logout', logout);
router.post('/refresh', parser(z.object({
    token: z.string("Le refresh token est requis")
        .min(1, "Le refresh token est requis")
})), refreshTokenEndpoint);

export default router;