import { Request, Response } from "express";
import User from "../models/Users";
import { reply, replyError } from "../utils";

/*
* Get user
*/
export const getUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user?.userId);
        if (!user) return replyError(res, 400, "Utilisateur non trouvé");
        
        return reply(res, 200, { user });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la récupération de l'utilisateur");
    }
}

/*
* Update user
*/
export const updateUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user?.userId);
        if (!user) return replyError(res, 400, "Utilisateur non trouvé");

        const { username, password } = req.body;
        
        if (username) {
            user.username = username;
        }
        if (password) { 
            /*
            * Password will be hashed before saving
            */
            user.password = password;
        }
        
        user.set({
            username,
            password,
        });
        await user.save();

        return reply(res, 200, { message: "Utilisateur mis à jour avec succès", user });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la mise à jour de l'utilisateur");
    }
}

/*
* Delete user
*/ 
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user?.userId);
        if (!user) return replyError(res, 400, "Utilisateur non trouvé");

        await user.destroy();

        return reply(res, 200, { message: "Utilisateur supprimé avec succès" });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la suppression de l'utilisateur");
    }
}