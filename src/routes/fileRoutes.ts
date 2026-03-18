import { Router, Request } from "express";
import { getFilesByFolder, uploadFile, downloadFile, deleteFile } from "../controllers/fileController"
import { parser, verifyToken, upload } from "../utils";
import { z } from "zod";

const router = Router();


router.get('/:folderId', verifyToken, parser(z.object({
    folderId: z.number()
})) ,getFilesByFolder);

router.get('/download/:id', verifyToken, parser(z.object({
    
})), downloadFile);

router.post('/upload', parser(z.object({
    folderId: z.number(), 
})), verifyToken, upload.single("file"), uploadFile);

router.delete('/:fileId', verifyToken, deleteFile);


export default router;