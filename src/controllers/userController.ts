import { Request, Response } from "express";
import { User } from "../models";
import { reply, replyError } from "../utils/other";

const toPublicUser = (user: User) => ({
    userId: user.userId,
    username: user.username,
    isAdmin: user.isAdmin,
    mfaEnabled: user.mfaEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

/*
* Get user
*/
export const getUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) return replyError(res, 404, "Utilisateur non trouve");

        return reply(res, 200, { user: toPublicUser(user) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation de l'utilisateur");
    }
};

/*
* Update user
*/
export const updateUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) return replyError(res, 404, "Utilisateur non trouve");

        const { username, password } = req.body;
        const updateData: Partial<{ username: string; password: string }> = {};

        if (username) updateData.username = username;
        if (password) updateData.password = password;

        await user.update(updateData);

        return reply(res, 200, { message: "Utilisateur mis a jour avec succes", user: toPublicUser(user) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la mise a jour de l'utilisateur");
    }
};

/*
* Delete user
*/
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) return replyError(res, 404, "Utilisateur non trouve");

        await user.destroy();

        return reply(res, 200, { message: "Utilisateur supprime avec succes" });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la suppression de l'utilisateur");
    }
};
