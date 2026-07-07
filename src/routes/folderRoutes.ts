import { Router } from "express";
import { createFolder, getFolder, getFolders, updateFolder, deleteFolder } from "../controllers/folderController";
import { verifyToken, parser } from "../utils";
import { z } from "zod";

const router = Router();

const folderPasswordSchema = z.string()
    .min(12, "Le mot de passe doit faire au minimum 12 caracteres")
    .max(128, "Le mot de passe ne peut pas faire plus de 128 caracteres")
    .optional();

router.get("/parent/:parentId", verifyToken, getFolders);
router.get("/:id", verifyToken, getFolder);

router.post("/create", verifyToken, parser(z.object({
    name: z.string()
        .min(3, "Le nom du dossier doit faire au moins 3 caracteres")
        .max(50, "Le nom du dossier ne peut pas faire plus de 50 caracteres"),
    parentFolderId: z.number().int().nonnegative(),
    password: folderPasswordSchema,
    isPublic: z.boolean().default(false),
})), createFolder);

router.put("/update", verifyToken, parser(z.object({
    folderId: z.number().int().positive(),
    name: z.string()
        .min(3, "Le nom du dossier doit faire au moins 3 caracteres")
        .max(50, "Le nom du dossier ne peut pas faire plus de 50 caracteres")
        .optional(),
    password: folderPasswordSchema,
    isPublic: z.boolean()
        .optional()
})), updateFolder);

router.delete("/:id", verifyToken, deleteFolder);

export default router;
