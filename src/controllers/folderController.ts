import { Request, Response } from "express";
import { Folder } from "../models";
import { reply, replyError } from "../utils/other";
import { decryptMetadata } from "../utils";

const toPublicFolder = (folder: Folder) => ({
    folderId: folder.folderId,
    name: decryptMetadata(folder.name) || folder.name,
    parentFolderId: folder.parentFolderId,
    isPublic: folder.isPublic,
    ownerId: folder.ownerId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
});

/*
* Get folder
*/
export const getFolder = async (req: Request, res: Response) => {
    try {
        const userId = req.user.userId;
        const folder = await Folder.findByPk(req.params.id);

        if (!folder) return replyError(res, 404, "Dossier non trouve");
        if (!(await folder.isAccessibleBy(userId))) return replyError(res, 403, "Acces refuse");

        return reply(res, 200, { folder: toPublicFolder(folder) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation du dossier");
    }
};

/*
* Get folders by parent folder ID
*/
export const getFolders = async (req: Request, res: Response) => {
    try {
        const userId = req.user.userId;
        const parentFolderId = parseInt(req.params.parentId);

        if (isNaN(parentFolderId)) {
            return replyError(res, 400, "Dossier parent invalide");
        }

        const folderList = await Folder.findAll({ where: { parentFolderId } });
        const accessibleFolders: Folder[] = [];

        for (const folder of folderList) {
            if (await folder.isAccessibleBy(userId)) {
                accessibleFolders.push(folder);
            }
        }

        return reply(res, 200, { folders: accessibleFolders.map(toPublicFolder) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation des dossiers");
    }
};

/*
* Create folder
*/
export const createFolder = async (req: Request, res: Response) => {
    try {
        const { name, parentFolderId, password, isPublic } = req.body;

        if (parentFolderId !== 0) {
            const parent = await Folder.findByPk(parentFolderId);
            if (!parent) return replyError(res, 404, "Dossier parent introuvable");

            if (!(await parent.hasFolderPermission(req.user.userId, "canEdit"))) {
                return replyError(res, 403, "Action non autorisee");
            }
        }

        const folder = await Folder.create({
            name,
            parentFolderId,
            password,
            isPublic,
            ownerId: req.user.userId
        });

        return reply(res, 201, { message: "Dossier cree avec succes", folder: toPublicFolder(folder) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la creation du dossier");
    }
};

/*
* Update folder
*/
export const updateFolder = async (req: Request, res: Response) => {
    try {
        const { folderId, name, password, isPublic } = req.body;
        const updateFolder: Partial<{ name: string, password: string, isPublic: boolean }> = {};

        const userId = req.user.userId;
        const folder = await Folder.findByPk(folderId);

        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!(await folder.hasFolderPermission(userId, "canEdit"))) return replyError(res, 403, "Acces refuse");

        if (name) updateFolder.name = name;
        if (password) updateFolder.password = password;
        if (isPublic !== undefined && isPublic !== null) updateFolder.isPublic = isPublic;

        await folder.update(updateFolder);

        return reply(res, 200, { message: "Dossier mis a jour", folder: toPublicFolder(folder) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la mise a jour du dossier");
    }
};

/*
* Delete folder
*/
export const deleteFolder = async (req: Request, res: Response) => {
    try {
        const userId = req.user.userId;
        const folderId = parseInt(req.params.id);
        if (isNaN(folderId)) return replyError(res, 400, "ID du dossier invalide");

        const folder = await Folder.findByPk(folderId);

        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!(await folder.hasFolderPermission(userId, "canDelete"))) return replyError(res, 403, "Acces refuse");

        await folder.destroy();

        return reply(res, 200, { message: "Dossier supprime avec succes" });
    } catch (error) {
        return replyError(res, 500, "Erreur de suppression du dossier");
    }
};
