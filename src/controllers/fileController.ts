import { Request, Response } from "express";
import { File, FileAccessLog, Folder } from "../models";
import { decryptMetadata, FileConverter, reply, replyError, replyFile, scanFileWithClamd } from "../utils";
import fs from "fs/promises";

const toPublicFile = (file: File) => ({
    fileId: file.fileId,
    orignalFileId: file.orignalFileId,
    folderId: file.folderId,
    ownerId: file.ownerId,
    diskId: file.diskId,
    fileName: decryptMetadata(file.originalName) || file.fileName,
    type: file.type,
    scanStatus: file.scanStatus,
    scannedAt: file.scannedAt,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
});

const toPublicFileAccessLog = (log: FileAccessLog) => ({
    logId: log.logId,
    fileId: log.fileId,
    userId: log.userId,
    action: log.action,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
});

const logFileAccess = async (req: Request, fileId: number, action: "create" | "view" | "download" | "edit" | "delete") => {
    await FileAccessLog.create({
        fileId,
        userId: req.user.userId,
        action,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("user-agent") || "unknown",
    }).catch(() => undefined);
};

/*
* Get files
*/
export const getFilesByFolder = async (req: Request, res: Response) => {
    try {
        const folderId = parseInt(req.params.folderId);
        if (isNaN(folderId)) return replyError(res, 400, "Id du dossier invalide");

        const folder = await Folder.findByPk(folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!(await folder.isAccessibleBy(req.user.userId))) return replyError(res, 403, "Acces non autorise");

        const fileList = await File.findAll({
            where: { folderId: folder.folderId, orignalFileId: null }
        });

        return reply(res, 200, { fileList: fileList.map(toPublicFile) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation des fichiers");
    }
};

/*
* Upload new file
*/
export const uploadFile = async (req: Request, res: Response) => {
    const tempPaths: string[] = [];
    const createdFiles: File[] = [];
    let completed = false;

    try {
        let file: File;
        const folderId = parseInt(req.body.folderId);
        if (isNaN(folderId)) return replyError(res, 400, "Id du dossier invalide");

        const folder = await Folder.findByPk(folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!(await folder.hasFolderPermission(req.user.userId, "canEdit"))) {
            return replyError(res, 403, "Action non autorisee");
        }

        const uploadedFile = req.file;
        if (!uploadedFile) return replyError(res, 400, "Aucun fichier fourni");
        tempPaths.push(uploadedFile.path);

        const scan = await scanFileWithClamd(uploadedFile.path);
        if (scan.status !== "clean") {
            return replyError(res, 400, scan.status === "infected" ? "Fichier infecte detecte" : "Scan antivirus impossible");
        }

        const data = await File.encryptSave(uploadedFile, null, folderId, req.user.userId, scan);
        if (data.success && data.createdFile) {
            file = data.createdFile;
            createdFiles.push(file);
        } else {
            return replyError(res, 400, data.message);
        }

        if (FileConverter.shouldConvert(uploadedFile)) {
            const convertPath = await FileConverter.convertIfNeeded(uploadedFile);
            tempPaths.push(convertPath);

            const convertedScan = await scanFileWithClamd(convertPath);
            if (convertedScan.status !== "clean") {
                return replyError(res, 400, convertedScan.status === "infected" ? "Fichier converti infecte detecte" : "Scan antivirus du fichier converti impossible");
            }

            const convertedData = await File.encryptSave(convertPath, file.fileId, folderId, req.user.userId, convertedScan);
            if (convertedData.success && convertedData.createdFile) {
                file = convertedData.createdFile;
                createdFiles.push(file);
            } else {
                return replyError(res, 400, convertedData.message);
            }
        }
        await logFileAccess(req, file.fileId, "create");
        completed = true;

        return reply(res, 201, { file: toPublicFile(file) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors du telechargement sur le serveur");
    } finally {
        await Promise.all(tempPaths.map((tempPath) => fs.unlink(tempPath).catch(() => undefined)));
        if (!completed) {
            await Promise.all(createdFiles.map(async (createdFile) => {
                const encryptedPath = createdFile.filePath;
                await createdFile.destroy().catch(() => undefined);
                await fs.unlink(encryptedPath).catch(() => undefined);
            }));
        }
    }
};

/*
* Download file
*/
export const downloadFile = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.id);
        if (isNaN(fileId)) return replyError(res, 400, "Id du fichier invalide");

        const file = await File.findByPk(fileId);
        if (!file) return replyError(res, 404, "Fichier introuvable");

        const folder = await Folder.findByPk(file.folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!(await folder.isAccessibleBy(req.user.userId))) return replyError(res, 403, "Acces non autorise");
        if (file.scanStatus !== "clean") return replyError(res, 423, "Fichier non disponible: scan antivirus non valide");

        const data = await file.decrypt();
        await logFileAccess(req, file.fileId, "download");
        return replyFile(res, 200, file, data);
    } catch (error) {
        return replyError(res, 500, "Erreur lors du telechargement du fichier");
    }
};

export const getFileScanStatus = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.fileId);
        if (isNaN(fileId)) return replyError(res, 400, "Id du fichier invalide");

        const file = await File.findByPk(fileId);
        if (!file) return replyError(res, 404, "Fichier introuvable");

        const folder = await Folder.findByPk(file.folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!(await folder.isAccessibleBy(req.user.userId))) return replyError(res, 403, "Acces non autorise");

        return reply(res, 200, {
            scanStatus: file.scanStatus,
            scanEngine: file.scanEngine,
            scanResult: file.scanResult,
            scannedAt: file.scannedAt,
        });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation du statut antivirus");
    }
};

/*
* Delete file
*/
export const deleteFile = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.fileId);
        if (isNaN(fileId)) return replyError(res, 400, "Id du fichier invalide");

        const file = await File.findByPk(fileId);
        if (!file) return replyError(res, 404, "Fichier introuvable");

        const folder = await Folder.findByPk(file.folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!(await folder.hasFolderPermission(req.user.userId, "canDelete"))) {
            return replyError(res, 403, "Action non autorisee");
        }

        const filePath = file.filePath;
        await logFileAccess(req, file.fileId, "delete");
        await file.destroy();
        await fs.unlink(filePath).catch(() => undefined);
        
        return reply(res, 200, { message: "Fichier supprime avec succes" });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la suppression du fichier");
    }
};

export const getFileAccessLogs = async (req: Request, res: Response) => {
    try {
        const fileId = parseInt(req.params.fileId);
        if (isNaN(fileId)) return replyError(res, 400, "Id du fichier invalide");

        const file = await File.findByPk(fileId);
        if (!file) return replyError(res, 404, "Fichier introuvable");

        const folder = await Folder.findByPk(file.folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!folder.isOwner(req.user.userId) && !req.user.isAdmin) return replyError(res, 403, "Acces non autorise");

        const logs = await FileAccessLog.findAll({
            where: { fileId },
            order: [["createdAt", "DESC"]],
            limit: 100,
        });

        return reply(res, 200, { logs: logs.map(toPublicFileAccessLog) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation des logs du fichier");
    }
};
