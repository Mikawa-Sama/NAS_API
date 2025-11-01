import { Request, Response } from "express";
import { Folder } from "../models";
import { reply, replyError } from "../utils/other";
import { Op, literal } from "sequelize";

/*
* Get folder
*/
export const getFolder = async (req: Request, res: Response) => {
    try {
        const userId: number = req.user?.userId;
        const folder: Folder | null = await Folder.findByPk(req.params.id);

        if (!folder) return replyError(res, 400, "Dossier non trouvé");
        if (!folder.isAccessibleBy(userId)) return replyError(res, 403, "Accès refusé");

        return reply(res, 200, { folder });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la récupération du dossier");
    }
};

/*
* Get folders by parent folder ID
*/
export const getFolders = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId!;
        const parentFolderId = parseInt(req.params.parentId);

        if (isNaN(parentFolderId)) {
            return replyError(res, 400, "Dossier parent invalide");
        }

        /*
        * If folder doesn't have parent, his parentFolderId = 0
        */
        const folderList = await Folder.findAll({
            where: { parentFolderId, [Op.or]: [
                { ownerId: userId }, { isPublic: true },
                literal(`EXISTS(
                    SELECT 1 
                    FROM folderAccess 
                    WHERE folderAccess.folderId = folder.folderId
                    AND folderAccess.userId = ${userId}
                    AND fodlerAccess.canView = 1
                    )`
                ),
            ]},  
        });

        if (!folderList) {
            return replyError(res, 404, "Aucun dossier");
        }

        return reply(res, 200, { folders: folderList });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la récupération des dossiers");
    }
};

/*
* Create folder
*/
export const createFolder = async (req: Request, res: Response) => {
    try {
        const { name, parentFolderId, password, isPublic } = req.body

        if (parentFolderId != 0) {
            const parent = await Folder.findByPk(parentFolderId)
            if (!parent) return replyError(res, 404, "Dossier parent introuvable");

            if (parent.ownerId !== req.user?.userId) return replyError(res, 403, "Action non autorisé");
        }

        const folder = await Folder.create({ 
            name, parentFolderId, 
            password, isPublic, 
            ownerId: req.user!.userId 
        } as any);

        return reply(res, 201, { message: "Dossier créé avec succès", folder });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la création du dossier");
    }
};

/*
* Update folder
*/
export const updateFolder = async (req: Request, res: Response) => {
    try {
        const { folderId, name, password, isPublic } = req.body
        const updateFolder: Partial<{ name: string, password: string, isPublic: boolean }> = {};

        const userId: number = req.user?.userId;
        const folder: Folder | null = await Folder.findByPk(folderId);
        
        if (!folder) return replyError(res, 400, "Dossier introuvable");
        if (!folder.isAccessibleBy(userId)) return replyError(res, 403, "Accès refusé");

        if (name) updateFolder.name = name;
        if (password) updateFolder.password = password;
        if (isPublic !== undefined && isPublic !== null) updateFolder.isPublic = isPublic;

        await folder.update(updateFolder);

        return reply(res, 200, { message: "Dossier mis à jour", folder });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la mise à jour du dossier");
    }
};


/*
* Delete folder
*/
export const deleteFolder = async (req: Request, res: Response) => {
    try {
        const userId: number = req.user?.userId;
        const folderId: number = parseInt(req.params.id);
        if (isNaN(folderId)) return replyError(res, 400, "ID du dossier invalide");

        const folder: Folder | null = await Folder.findByPk(folderId);
        
        if (!folder) return replyError(res, 400, "Dossier introuvable");
        if (!folder.isAccessibleBy(userId)) return replyError(res, 403, "Accès refusé");

        await folder.destroy();

        return reply(res, 200, { message: "Dossier supprimé avec succès" });
    } catch (error) {
        return replyError(res, 500, "Erreur de suppression du dossier");
    }
};