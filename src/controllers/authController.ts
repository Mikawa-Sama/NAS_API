import { Request, Response } from "express";
import { reply, replyError, encryptMfaSecret, generateAccessToken, generateMfaSetup, generateRefreshToken, hashRefreshToken, refreshAccessToken, setCsrfCookie, verifyMfaCode } from "../utils";
import { AccountAccessLog, RefreshToken, User, UserDevice } from "../models";

const getRequestIp = (req: Request): string => {
    const forwardedFor = req.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0].trim();

    return req.ip || req.socket.remoteAddress || "unknown";
};

const getCookieValue = (req: Request, name: string): string | null => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));
    if (!cookie) return null;

    return decodeURIComponent(cookie.slice(name.length + 1));
};

const refreshCookieOptions = () => {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return `HttpOnly; SameSite=Strict; Path=/auth; Max-Age=${7 * 24 * 60 * 60}${secure}`;
};

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
    res.setHeader("Set-Cookie", `refreshToken=${encodeURIComponent(refreshToken)}; ${refreshCookieOptions()}`);
};

const clearRefreshTokenCookie = (res: Response) => {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `refreshToken=; HttpOnly; SameSite=Strict; Path=/auth; Max-Age=0${secure}`);
};

const logAccountAccess = async (
    req: Request,
    username: string,
    action: "login_success" | "login_failure" | "logout" | "refresh",
    userId?: number | null,
    deviceId?: number | null,
) => {
    await AccountAccessLog.create({
        userId: userId ?? null,
        deviceId: deviceId ?? null,
        username,
        action,
        ipAddress: getRequestIp(req),
        userAgent: req.get("user-agent") || "unknown",
        location: null,
    }).catch(() => undefined);
};

const getDeviceName = (req: Request, providedName?: string): string => {
    if (providedName?.trim()) return providedName.trim();

    const userAgent = req.get("user-agent");
    if (!userAgent) return "Nouvel appareil";

    return userAgent.slice(0, 80);
};

const toPublicDevice = (device: UserDevice) => ({
    deviceId: device.deviceId,
    name: device.name,
    userAgent: device.userAgent,
    ipAddress: device.ipAddress,
    lastIpAddress: device.lastIpAddress,
    lastUsedAt: device.lastUsedAt,
    revokedAt: device.revokedAt,
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
});

const toPublicUserSecurity = (user: User) => ({
    userId: user.userId,
    username: user.username,
    mfaEnabled: user.mfaEnabled,
});

const toPublicAccountAccessLog = (log: AccountAccessLog) => ({
    accountAccessLogId: log.accountAccessLogId,
    userId: log.userId,
    deviceId: log.deviceId,
    username: log.username,
    action: log.action,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    location: log.location,
    createdAt: log.createdAt,
});

export const getCsrfToken = (req: Request, res: Response) => {
    const csrfToken = setCsrfCookie(res);
    return reply(res, 200, { csrfToken });
};

/*
* Register
*/
export const register = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) return replyError(res, 409, "Nom d'utilisateur deja utilise");

        await User.create({ username, password });
        return reply(res, 201, { message: "Utilisateur cree" });
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
        const { username, password, deviceName, totpCode } = req.body;
        const user = await User.findOne({ where: { username } });

        if (!user) {
            await logAccountAccess(req, username, "login_failure");
            return replyError(res, 401, "Identifiants invalides");
        }

        const validPassword = await user.verifyPassword(password);
        if (!validPassword) {
            await logAccountAccess(req, username, "login_failure", user.userId);
            return replyError(res, 401, "Identifiants invalides");
        }

        if (user.mfaEnabled) {
            if (!user.mfaSecret || !totpCode || !verifyMfaCode(user.mfaSecret, totpCode)) {
                await logAccountAccess(req, username, "login_failure", user.userId);
                return reply(res, 401, { message: "Code MFA requis ou invalide", mfaRequired: true }, false);
            }
        }

        const device = await UserDevice.create({
            userId: user.userId,
            name: getDeviceName(req, deviceName),
            userAgent: req.get("user-agent") || "unknown",
            ipAddress: getRequestIp(req),
            lastIpAddress: getRequestIp(req),
            lastUsedAt: new Date(),
        });

        const token = generateAccessToken(user.userId, user.username, device.deviceId);
        const refreshToken = await generateRefreshToken(user.userId, device.deviceId);
        await logAccountAccess(req, user.username, "login_success", user.userId, device.deviceId);
        setRefreshTokenCookie(res, refreshToken);
        return reply(res, 200, { message: "Connexion reussie", token, device: toPublicDevice(device) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la connexion");
    }
};

export const setupMfa = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) return replyError(res, 404, "Utilisateur introuvable");
        if (user.mfaEnabled) return replyError(res, 409, "MFA deja activee");

        const setup = await generateMfaSetup(user.username);
        await user.update({
            mfaSecret: encryptMfaSecret(setup.secret),
            mfaEnabled: false,
        });

        return reply(res, 200, {
            otpauthUrl: setup.otpauthUrl,
            qrCodeDataUrl: setup.qrCodeDataUrl,
        });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la preparation MFA");
    }
};

export const enableMfa = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) return replyError(res, 404, "Utilisateur introuvable");
        if (!user.mfaSecret) return replyError(res, 400, "MFA non configuree");

        if (!verifyMfaCode(user.mfaSecret, req.body.code)) {
            return replyError(res, 400, "Code MFA invalide");
        }

        await user.update({ mfaEnabled: true });

        return reply(res, 200, { user: toPublicUserSecurity(user) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de l'activation MFA");
    }
};

export const disableMfa = async (req: Request, res: Response) => {
    try {
        const user = await User.findByPk(req.user.userId);
        if (!user) return replyError(res, 404, "Utilisateur introuvable");

        const validPassword = await user.verifyPassword(req.body.password);
        if (!validPassword) return replyError(res, 401, "Mot de passe invalide");

        if (user.mfaEnabled && (!user.mfaSecret || !verifyMfaCode(user.mfaSecret, req.body.code))) {
            return replyError(res, 400, "Code MFA invalide");
        }

        await user.update({ mfaEnabled: false, mfaSecret: null });

        return reply(res, 200, { user: toPublicUserSecurity(user) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la desactivation MFA");
    }
};

/*
* Logout
*/
export const logout = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.body.refreshToken || getCookieValue(req, "refreshToken");
        if (!refreshToken) return reply(res, 200, { message : "Pas de refreshToken a supprimer" });

        const savedToken = await RefreshToken.findOne({ where: { token: hashRefreshToken(refreshToken) } });
        if (savedToken) {
            const user = await User.findByPk(savedToken.userId);
            const device = await UserDevice.findByPk(savedToken.deviceId);
            await logAccountAccess(req, user?.username || "unknown", "logout", savedToken.userId, savedToken.deviceId);
            await savedToken.destroy();
            await device?.update({ revokedAt: new Date() });
        }

        clearRefreshTokenCookie(res);
        return reply(res, 200, { message: "RefreshToken detruit" });
    } catch (error) {
        return replyError(res);
    }
};

/*
* Refresh token
*/
export const refreshTokenEndpoint = async (req: Request, res: Response) => {
    const token = req.body.token || getCookieValue(req, "refreshToken");
    if (!token) return replyError(res, 400, "Refresh token manquant");

    const tokenPair = await refreshAccessToken(token);

    if (!tokenPair) {
        return replyError(res, 403, "Refresh token invalide ou expire");
    }

    await logAccountAccess(req, tokenPair.username, "refresh", tokenPair.userId, tokenPair.deviceId);

    setRefreshTokenCookie(res, tokenPair.refreshToken);

    return reply(res, 200, {
        accessToken: tokenPair.accessToken,
    });
};

export const getDevices = async (req: Request, res: Response) => {
    try {
        const devices = await UserDevice.findAll({
            where: { userId: req.user.userId },
            order: [["lastUsedAt", "DESC"]],
        });

        return reply(res, 200, { devices: devices.map(toPublicDevice) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation des appareils");
    }
};

export const getAccountAccessLogs = async (req: Request, res: Response) => {
    try {
        const logs = await AccountAccessLog.findAll({
            where: { userId: req.user.userId },
            order: [["createdAt", "DESC"]],
            limit: 100,
        });

        return reply(res, 200, { logs: logs.map(toPublicAccountAccessLog) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation de l'historique de connexion");
    }
};

export const renameDevice = async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        if (isNaN(deviceId)) return replyError(res, 400, "Id appareil invalide");

        const device = await UserDevice.findOne({ where: { deviceId, userId: req.user.userId } });
        if (!device) return replyError(res, 404, "Appareil introuvable");

        await device.update({ name: req.body.name });

        return reply(res, 200, { device: toPublicDevice(device) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors du renommage de l'appareil");
    }
};

export const revokeDevice = async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        if (isNaN(deviceId)) return replyError(res, 400, "Id appareil invalide");

        const device = await UserDevice.findOne({ where: { deviceId, userId: req.user.userId } });
        if (!device) return replyError(res, 404, "Appareil introuvable");

        await RefreshToken.destroy({ where: { deviceId, userId: req.user.userId } });
        await logAccountAccess(req, req.user.username, "logout", req.user.userId, device.deviceId);
        await device.update({ revokedAt: new Date() });

        return reply(res, 200, { message: "Appareil deconnecte" });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la deconnexion de l'appareil");
    }
};
