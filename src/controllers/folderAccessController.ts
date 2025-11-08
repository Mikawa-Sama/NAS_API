import { Request, Response } from "express";
import { Folder, FolderAccess } from "../models";
import { reply, replyError } from "../utils";

/*
* Get permession
*/
export const getPermissionByFolder = async (req: Request, res: Response) => {
    try {
        let folder: Folder | null;
        let permissionList: FolderAccess[] | null;

        const folderId: number = parseInt(req.params.fileId);
        if (isNaN(folderId)) return  replyError(res, 400, "Id du dossier manquant");

        folder = await Folder.findByPk(folderId);

        if (!folder) return replyError(res, 400, "Dossier introuvable");
        if (folder.isOwner(req.user.userId)) return replyError(res, 403, "Accès non autorisé");

        permissionList = await FolderAccess.findAll({
            where: { folderId: folder.folderId }
        });
        if (!permissionList) return replyError(res, 404, "Pas de permission");

        return reply(res, 200, { permissionList });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la récupération des permissions");
    }
};


/*
* Create permission
*/
export const createPermission = async (req: Request, res: Response) => {
    try {
        let folder: Folder | null;
        let permission: FolderAccess | null;

        const { folderId, userId, canView, canEdit, canDelete } = req.body;

        folder = await Folder.findByPk(folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");

        if (!folder.isOwner(req.user.userId)) return replyError(res, 500, "Action non autorisé");

        permission = await FolderAccess.create({
            folderId,
            userId,
            canView,
            canEdit,
            canDelete
        } as FolderAccess);

        if (!permission) return replyError(res, 400, "Erreur lors de la création de la permission");

        return reply(res, 201, { message: "Permission créé avec succès", permission });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la création de la permission");
    }
};


/*
* Update permission
*/
export const updatePermission = async (req: Request, res: Response) => {
    try {
        let folder: Folder | null;
        let permission: FolderAccess | null;

        const userId: number = req.user.userId;
        const { folderAccessId, canView, canEdit, canDelete } = req.body;
        const updatePermission: Partial<{ canView: boolean, canEdit: boolean, canDelete: boolean }> = {};

        permission = await FolderAccess.findByPk(folderAccessId);
        if (!permission) return replyError(res, 404, "Permission introuvable");

        folder = await Folder.findByPk(permission.folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");

        if (!folder.isOwner(userId)) return replyError(res, 500, "Action non autorisé");

        if (canView !== undefined && canView !== null) updatePermission.canView = canView;
        if (canEdit !== undefined && canEdit !== null) updatePermission.canEdit = canEdit;
        if (canDelete !== undefined && canDelete !== null) updatePermission.canDelete = canDelete;

        await permission.update(updatePermission);

        return reply(res, 200, { message: "Permission mise à jour", permission});
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la modification de la permission");
    }
};



/*
* Delete permission
*/
export const deletePerssion = async (req: Request, res: Response) => {
    try {
        let folder: Folder | null;
        let permission: FolderAccess | null;
        
        const userId: number = req.user.userId;
        const permissionId: number = parseInt(req.params.permissionId);

        if (isNaN(permissionId)) return replyError(res, 500, "Id de la permission manquant");

        permission = await FolderAccess.findByPk(permissionId);
        if (!permission) return replyError(res, 404, "Permission introuvable");

        folder = await Folder.findByPk(permission.folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");

        if (!folder.isOwner(userId)) return replyError(res, 500, "Action non autorisé");

        await folder.destroy();

        return reply(res, 200, { message: "Permission supprimé avec succès" });
    } catch (error) {
        return replyError(res, 500, "Erreur de la suppression de la permission");
    }
};