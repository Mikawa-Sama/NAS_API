import { Router } from "express";
import { createDisk, deleteDisk, getDisks, getSecurityAudit, getStorageSummary, getSystemHealth, updateDisk } from "../controllers/adminController";
import { parser, verifyAdmin, verifyToken } from "../utils";
import { z } from "zod";

const router = Router();

router.use(verifyToken, verifyAdmin);

router.get("/system/health", getSystemHealth);
router.get("/system/storage", getStorageSummary);
router.get("/security/audit", getSecurityAudit);
router.get("/disks", getDisks);
router.post("/disks", parser(z.object({
    name: z.string().trim().min(1).max(80),
    path: z.string().trim().min(1),
    isEnabled: z.boolean().optional(),
})), createDisk);
router.patch("/disks/:diskId", parser(z.object({
    name: z.string().trim().min(1).max(80).optional(),
    path: z.string().trim().min(1).optional(),
    isEnabled: z.boolean().optional(),
})), updateDisk);
router.delete("/disks/:diskId", deleteDisk);

export default router;
