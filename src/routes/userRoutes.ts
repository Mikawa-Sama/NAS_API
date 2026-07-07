import { Router } from "express";
import { getUser, updateUser, deleteUser } from "../controllers/userController";
import { parser, verifyToken } from "../utils";
import { z } from "zod";

const router = Router();

router.get("/me", verifyToken, getUser);
router.put("/me", verifyToken, parser(z.object({
    username: z.string()
        .trim()
        .min(3, "Le nom d'utilisateur doit faire au minimum 3 caracteres")
        .max(30, "Le nom d'utilisateur ne peut pas faire plus de 30 caracteres")
        .regex(/^[a-zA-Z0-9_.-]+$/, "Le nom d'utilisateur contient des caracteres interdits")
        .optional(),
    password: z.string()
        .min(12, "Le mot de passe doit faire au minimum 12 caracteres")
        .max(128, "Le mot de passe ne doit pas faire plus de 128 caracteres")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).+$/,
            "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractere special"
        )
        .optional(),
}).refine((data) => data.username || data.password, {
    message: "Au moins un champ doit etre fourni",
})), updateUser);
router.delete("/me", verifyToken, deleteUser);

export default router;
