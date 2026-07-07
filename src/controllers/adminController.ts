import { Request, Response } from "express";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { AccountAccessLog, Disk, File, FileAccessLog, Folder, RefreshToken, User } from "../models";
import { pingClamd, reply, replyError } from "../utils";

const toPublicDisk = (disk: Disk) => ({
    diskId: disk.diskId,
    name: disk.name,
    path: disk.path,
    capacity: Number(disk.capacity),
    freeSpace: Number(disk.freeSpace),
    usedSpace: Math.max(Number(disk.capacity) - Number(disk.freeSpace), 0),
    isEnabled: disk.isEnabled,
    isHealthy: disk.isHealthy,
    lastHealthCheckAt: disk.lastHealthCheckAt,
    createdAt: disk.createdAt,
    updatedAt: disk.updatedAt,
});

const assertSafeDiskPath = async (diskPath: string): Promise<string> => {
    const resolvedPath = path.resolve(diskPath);
    const parsed = path.parse(resolvedPath);

    if (resolvedPath === parsed.root && process.env.ALLOW_ROOT_DISK !== "true") {
        throw new Error("Root disk path is not allowed");
    }

    await fs.mkdir(resolvedPath, { recursive: true });
    await fs.access(resolvedPath);

    return resolvedPath;
};

const getPathStats = async (diskPath: string) => {
    const stats = await fs.statfs(diskPath);
    const capacity = Number(stats.blocks) * Number(stats.bsize);
    const freeSpace = Number(stats.bavail) * Number(stats.bsize);

    return { capacity, freeSpace };
};

const refreshDiskHealth = async (disk: Disk): Promise<Disk> => {
    try {
        const stats = await getPathStats(disk.path);
        await disk.update({
            capacity: stats.capacity,
            freeSpace: stats.freeSpace,
            isHealthy: true,
            lastHealthCheckAt: new Date(),
        });
    } catch (error) {
        await disk.update({
            isHealthy: false,
            lastHealthCheckAt: new Date(),
        });
    }

    return disk;
};

export const getSystemHealth = async (req: Request, res: Response) => {
    try {
        const [users, folders, files, activeRefreshTokens, accountLogs, fileLogs] = await Promise.all([
            User.count(),
            Folder.count(),
            File.count(),
            RefreshToken.count(),
            AccountAccessLog.count(),
            FileAccessLog.count(),
        ]);
        const antivirus = await pingClamd();

        return reply(res, 200, {
            status: "ok",
            antivirus,
            uptimeSeconds: process.uptime(),
            hostname: os.hostname(),
            platform: os.platform(),
            nodeVersion: process.version,
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                processRss: process.memoryUsage().rss,
                processHeapUsed: process.memoryUsage().heapUsed,
            },
            counts: {
                users,
                folders,
                files,
                activeRefreshTokens,
                accountLogs,
                fileLogs,
            },
        });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation de la sante systeme");
    }
};

export const getSecurityAudit = async (req: Request, res: Response) => {
    try {
        const [accountLogs, fileLogs] = await Promise.all([
            AccountAccessLog.findAll({
                order: [["createdAt", "DESC"]],
                limit: 100,
            }),
            FileAccessLog.findAll({
                order: [["createdAt", "DESC"]],
                limit: 100,
            }),
        ]);

        return reply(res, 200, {
            accountLogs,
            fileLogs,
        });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation de l'audit securite");
    }
};

export const getStorageSummary = async (req: Request, res: Response) => {
    try {
        const disks = await Disk.findAll();
        const refreshedDisks = [];

        for (const disk of disks) {
            refreshedDisks.push(await refreshDiskHealth(disk));
        }

        const totals = refreshedDisks.reduce((acc, disk) => {
            if (!disk.isEnabled) return acc;

            acc.capacity += Number(disk.capacity);
            acc.freeSpace += Number(disk.freeSpace);
            return acc;
        }, { capacity: 0, freeSpace: 0 });

        return reply(res, 200, {
            disks: refreshedDisks.map(toPublicDisk),
            totals: {
                capacity: totals.capacity,
                freeSpace: totals.freeSpace,
                usedSpace: Math.max(totals.capacity - totals.freeSpace, 0),
            },
        });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation du stockage");
    }
};

export const getDisks = async (req: Request, res: Response) => {
    try {
        const disks = await Disk.findAll({ order: [["createdAt", "DESC"]] });
        const refreshedDisks = [];

        for (const disk of disks) {
            refreshedDisks.push(await refreshDiskHealth(disk));
        }

        return reply(res, 200, { disks: refreshedDisks.map(toPublicDisk) });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la recuperation des disques");
    }
};

export const createDisk = async (req: Request, res: Response) => {
    try {
        const safePath = await assertSafeDiskPath(req.body.path);
        const stats = await getPathStats(safePath);

        const disk = await Disk.create({
            name: req.body.name,
            path: safePath,
            capacity: stats.capacity,
            freeSpace: stats.freeSpace,
            isEnabled: req.body.isEnabled ?? true,
            isHealthy: true,
            lastHealthCheckAt: new Date(),
        });

        return reply(res, 201, { disk: toPublicDisk(disk) });
    } catch (error: any) {
        return replyError(res, 400, error.message || "Erreur lors de l'ajout du disque");
    }
};

export const updateDisk = async (req: Request, res: Response) => {
    try {
        const diskId = parseInt(req.params.diskId);
        if (isNaN(diskId)) return replyError(res, 400, "Id disque invalide");

        const disk = await Disk.findByPk(diskId);
        if (!disk) return replyError(res, 404, "Disque introuvable");

        const updates: Partial<{ name: string; path: string; isEnabled: boolean }> = {};

        if (req.body.name) updates.name = req.body.name;
        if (req.body.isEnabled !== undefined) updates.isEnabled = req.body.isEnabled;
        if (req.body.path) updates.path = await assertSafeDiskPath(req.body.path);

        await disk.update(updates);
        await refreshDiskHealth(disk);

        return reply(res, 200, { disk: toPublicDisk(disk) });
    } catch (error: any) {
        return replyError(res, 400, error.message || "Erreur lors de la mise a jour du disque");
    }
};

export const deleteDisk = async (req: Request, res: Response) => {
    try {
        const diskId = parseInt(req.params.diskId);
        if (isNaN(diskId)) return replyError(res, 400, "Id disque invalide");

        const disk = await Disk.findByPk(diskId);
        if (!disk) return replyError(res, 404, "Disque introuvable");

        const fileCount = await File.count({ where: { diskId: disk.diskId } });
        if (fileCount > 0) return replyError(res, 409, "Impossible de supprimer un disque qui contient des fichiers");

        await disk.destroy();

        return reply(res, 200, { message: "Disque supprime" });
    } catch (error) {
        return replyError(res, 500, "Erreur lors de la suppression du disque");
    }
};
