import { Request, Response } from "express";
import { Folder, FolderAccess, User } from "../models";
import { reply, replyError } from "../utils";

const toPublicPermission = (permission: FolderAccess) => ({
    folderAccessId: permission.folderAccessId,
    folderId: permission.folderId,
    userId: permission.userId,
    canView: permission.canView,
    canEdit: permission.canEdit,
    canDelete: permission.canDelete,
    createdAt: permission.createdAt,
    updatedAt: permission.updatedAt,
});

/*
* Get permission
*/
export const getPermissionByFolder = async (req: Request, res: Response) => {
    try {
        const folderId = parseInt(req.params.folderId);
        if (isNaN(folderId)) return replyError(res, 400, "Id du dossier manquant");

        const folder = await Folder.findByPk(folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");
        if (!folder.isOwner(req.user.userId)) return replyError(res, 403, "Acces non autorise");

        const permissionList = await FolderAccess.findAll({
            where: { folderId: folder.folderId }
        });

        return reply(res, 200, { permissionList: permissionList.map(toPublicPermission) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation des permissions");
    }
};

/*
* Create permission
*/
export const createPermission = async (req: Request, res: Response) => {
    try {
        const { folderId, userId, canView, canEdit, canDelete } = req.body;

        const folder = await Folder.findByPk(folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");

        if (!folder.isOwner(req.user.userId)) return replyError(res, 403, "Action non autorisee");
        if (folder.isOwner(userId)) return replyError(res, 400, "Le proprietaire a deja tous les droits");

        const targetUser = await User.findByPk(userId);
        if (!targetUser) return replyError(res, 404, "Utilisateur introuvable");

        const existingPermission = await FolderAccess.findOne({ where: { folderId, userId } });
        if (existingPermission) return replyError(res, 409, "Une permission existe deja pour cet utilisateur");

        const permission = await FolderAccess.create({
            folderId,
            userId,
            canView: canView || canEdit || canDelete,
            canEdit,
            canDelete
        });

        return reply(res, 201, { message: "Permission creee avec succes", permission: toPublicPermission(permission) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la creation de la permission");
    }
};

/*
* Update permission
*/
export const updatePermission = async (req: Request, res: Response) => {
    try {
        const userId = req.user.userId;
        const { folderAccessId, canView, canEdit, canDelete } = req.body;
        const updatePermission: Partial<{ canView: boolean, canEdit: boolean, canDelete: boolean }> = {};

        const permission = await FolderAccess.findByPk(folderAccessId);
        if (!permission) return replyError(res, 404, "Permission introuvable");

        const folder = await Folder.findByPk(permission.folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");

        if (!folder.isOwner(userId)) return replyError(res, 403, "Action non autorisee");

        const nextCanEdit = canEdit ?? permission.canEdit;
        const nextCanDelete = canDelete ?? permission.canDelete;
        if (canView !== undefined && canView !== null) updatePermission.canView = canView || nextCanEdit || nextCanDelete;
        if (canEdit !== undefined && canEdit !== null) updatePermission.canEdit = canEdit;
        if (canDelete !== undefined && canDelete !== null) updatePermission.canDelete = canDelete;
        if ((canEdit === true || canDelete === true) && updatePermission.canView === undefined) {
            updatePermission.canView = true;
        }

        await permission.update(updatePermission);

        return reply(res, 200, { message: "Permission mise a jour", permission: toPublicPermission(permission) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la modification de la permission");
    }
};

/*
* Delete permission
*/
export const deletePerssion = async (req: Request, res: Response) => {
    try {
        const userId = req.user.userId;
        const permissionId = parseInt(req.params.permissionId);

        if (isNaN(permissionId)) return replyError(res, 400, "Id de la permission manquant");

        const permission = await FolderAccess.findByPk(permissionId);
        if (!permission) return replyError(res, 404, "Permission introuvable");

        const folder = await Folder.findByPk(permission.folderId);
        if (!folder) return replyError(res, 404, "Dossier introuvable");

        if (!folder.isOwner(userId)) return replyError(res, 403, "Action non autorisee");

        await permission.destroy();

        return reply(res, 200, { message: "Permission supprimee avec succes" });
    } catch (error) {
        return replyError(res, 500, "Erreur de la suppression de la permission");
    }
};
