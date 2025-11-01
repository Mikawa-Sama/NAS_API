import { Router } from "express";
import { getPermission, createPermission, updatePermission, deletePerssion } from "../controllers/folderAccessController"
import { parser, verifyToken } from "../utils";
import { z } from "zod";

const router = Router();

router.get('/:id', verifyToken, getPermission);

router.post('/create', parser(z.object({
    folderId: z.number(),
    userId: z.number(),
    canView: z.boolean(),
    canEdit: z.boolean()
        .optional(),
    canDelete: z.boolean()
        .optional()
})), verifyToken, createPermission);

router.put('/update', parser(z.object({
    folderAccessId: z.number(),
    canView: z.boolean()
        .optional(),
    canEdit: z.boolean()
    .optional(),
    canDelete: z.boolean()
    .optional()
})), verifyToken, updatePermission);

router.delete('/:id', verifyToken, deletePerssion);

export default router;
