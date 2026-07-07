import { Router } from "express";
import { getPermissionByFolder, createPermission, updatePermission, deletePerssion } from "../controllers/folderAccessController";
import { parser, verifyToken } from "../utils";
import { z } from "zod";

const router = Router();

router.get("/:folderId", verifyToken, getPermissionByFolder);

router.post("/create", verifyToken, parser(z.object({
    folderId: z.number().int().positive(),
    userId: z.number().int().positive(),
    canView: z.boolean().default(true),
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional()
})), createPermission);

router.put("/update", verifyToken, parser(z.object({
    folderAccessId: z.number().int().positive(),
    canView: z.boolean().optional(),
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional()
})), updatePermission);

router.delete("/:permissionId", verifyToken, deletePerssion);

export default router;
