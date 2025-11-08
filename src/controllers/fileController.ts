import { Request, Response } from "express";
import { File, Folder } from "../models";
import { FileConverter, reply, replyError } from "../utils";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Disk } from "../models/Disks";


/*
* Get files 
*/
export const getFilesByFolder = async (req: Request, res: Response) => {
    try {
        let folder: Folder | null;
        let fileList: File[] | null;

        const folderId: number = parseInt(req.params.folderId);
        if (isNaN(folderId)) return replyError(res, 400, "Id du dossier manquant");

        folder = await Folder.findByPk(folderId);

        if (!folder) return replyError(res, 400, "Dossier introuvable");
        if (await folder.isAccessibleBy(req.user.userId)) return replyError(res, 403, "Accès non aitorisé");

        fileList = await File.findAll({
            where: { folderId: folder.folderId, orignalFileId: undefined }
        });
        if (!fileList) return replyError(res, 404, "Pas de fichier");

        return reply(res, 200, { fileList });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la récupération des fichiers");
    }
};


/*
* Upload new file
*/
export const uploadFile = async (req: Request, res: Response) => {
    try {
        let file: File;
        const folderId: number = parseInt(req.body.folderId);

        const uploadedFile = req.file;
        if (!uploadedFile) return replyError(res, 400, "Aucun ficiher fourni");
        
        const data = await File.encryptSave(uploadedFile.path, null, folderId, req.user.userId);
        if (data.success && data.createdFile) {
            file = data.createdFile;
        } else {
            return replyError(res, 400, data.message);
        }

        if (FileConverter.shouldConvert(uploadedFile)) {
            /*
            * Need to convert the file and save it
            */
            const convertPath = await FileConverter.convertIfNeeded(uploadedFile);
            
            const data = await File.encryptSave(convertPath, file.fileId, folderId, req.user.userId);
            if (data.success && data.createdFile) {
                file = data.createdFile;
            } else {
                return replyError(res, 400, data.message);
            }
            
            await fs.unlink(convertPath);
        }
        await fs.unlink(uploadedFile.path);

        reply(res, 201, { file });
    } catch (error) {
        return replyError(res, 500, "Erreur lors du téléchargement sur le serveur");
    }
};


/*
* Download file
*/
export const downloadFile = async (req: Request, res: Response) => {

};


/*
* Delete file 
*/
export const deleteFile = async (req: Request, res: Response) => {

};