import { Router } from "express";
import { deleteFile, downloadFile, getFileAccessLogs, getFileScanStatus, getFilesByFolder, uploadFile } from "../controllers/fileController";
import { verifyToken, upload } from "../utils";

const router = Router();

router.get("/download/:id", verifyToken, downloadFile);
router.get("/:fileId/scan", verifyToken, getFileScanStatus);
router.get("/:fileId/logs", verifyToken, getFileAccessLogs);
router.post("/upload", verifyToken, upload.single("file"), uploadFile);
router.delete("/:fileId", verifyToken, deleteFile);
router.get("/:folderId", verifyToken, getFilesByFolder);

export default router;
