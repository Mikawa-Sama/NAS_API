import { Router } from "express";
import { createFolder, getFolder, getFolders, updateFolder, deleteFolder } from "../controllers/folderController";
import { verifyToken, parser } from "../utils";
import { z } from "zod"

const router = Router();

router.get('/parent/:parentId', verifyToken, getFolders);
router.get('/:id', verifyToken, getFolder);

router.post('/create', parser(z.object({
    name: z.string()
        .min(3, "Le nom du dossier doit faire au moins 3 caractères")
        .max(30, "Le nom du dossier ne peut pas faire plus de 50 caractères"),
    parentFolderId: z.number(),
    password: z.string()
        .min(4, "Le mot de passe doit faire au minimum 4 caractères")
        .max(20, "Le mot de passe ne peut pas faire plus de 20 caractères")
        .optional(),
    isPublic: z.boolean()
    })), verifyToken, createFolder);

router.put('/update', parser(z.object({
    folderId: z.number(),
    name: z.string()
        .min(3, "Le nom du dossier doit faire au moins 3 caractères")
        .max(30, "Le nom du dossier ne peut pas faire plus de 50 caractères")
        .optional(),
    password: z.string()
        .min(4, "Le mot de passe doit faire au minimum 4 caractères")
        .max(20, "Le mot de passe ne peut pas faire plus de 20 caractères")
        .optional(),
    isPublic: z.boolean()
        .optional()
})), verifyToken, updateFolder);

router.delete('/:id', verifyToken, deleteFolder);

export default router;