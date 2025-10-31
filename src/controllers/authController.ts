import { Request, Response } from "express";
import { reply, replyError, generateAccessToken, generateRefreshToken, refreshAccessToken } from "../utils";
import { RefreshToken, User } from "../models"


/*
* Register
*/
export const register = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body

        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) return replyError(res, 404, "Nom déjà utilisé");

        const user = await User.create({ username, password });
        return reply(res, 201, { message: "Utilisateur créé ! "});
    }
    catch (error) {
        return replyError(res, 500, "Erreur lors de l'inscription");
    }
};


/*
* Login
*/
export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username} });
        
        if (!user) return replyError(res, 400, "Utilisateur introuvable !");

        const validPassword = user.verifyPassword(password);
        if (!validPassword) return replyError(res, 401, "Mot de passe incorrect");

        const token = generateAccessToken(user.userId, user.username);
        const refreshToken = await generateRefreshToken(user.userId);
        return reply(res, 201, { message: "Connexion réussie", token, refreshToken });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la connexion");
    }
}

/*
* Logout
*/
export const logout = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body
        if (!refreshToken) return reply(res, 200, { message : "Pas de refreshToken à supprimé" });

        await RefreshToken.destroy({ where: { token: refreshToken } });

        return reply(res, 200, { message: "RefreshToken détruit" });
    } catch (error) {
        return replyError(res);
    }
};

/*
* refresh token
*/
export const refreshTokenEndpoint = async (req: Request, res: Response) => {
    const { token } = req.body;
    if (!token) return replyError(res, 400, "Refresh token manquant");

    const newAccessToken = await refreshAccessToken(token);

    if (!newAccessToken) {
        return replyError(res, 403, "Refresh token invalide ou expiré");
    }

    return reply(res, 200, { accessToken: newAccessToken });
};