import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../config/database";
import { IFile } from "../interfaces";
import crypto from "crypto";
import fs from "fs/promises";
import { createReadStream, createWriteStream } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Disk } from "./Disks";
import dotenv from "dotenv";
import { encryptMetadata } from "../utils/metadataCrypto";

dotenv.config();


/**
 * File model
 * @extends Model<IFile>
 */
type FileCreationAttributes = Optional<IFile, "fileId" | "orignalFileId" | "scanStatus" | "scanEngine" | "scanResult" | "scannedAt" | "createdAt" | "updatedAt">;

class File extends Model<IFile, FileCreationAttributes> implements IFile {
    public fileId!: number;
    public orignalFileId?: number | null;
    public folderId!: number;
    public ownerId!: number;
    public diskId!: number;
    public fileName!: string;
    public originalName?: string | null;
    public filePath!: string;
    public type!: string;
    public iv!: string;
    public encKey!: string;
    public authTag!: string;
    public scanStatus!: "pending" | "clean" | "infected" | "failed";
    public scanEngine?: string | null;
    public scanResult?: string | null;
    public scannedAt?: Date | null;
    public readonly createdAt!: Date;
    public updatedAt!: Date;

    private static getMasterKey(): Buffer {
        const masterKey = process.env.MASTER_KEY;
        if (!masterKey || masterKey.length < 32) {
            throw new Error("MASTER_KEY must be set and contain at least 32 characters");
        }

        return crypto.createHash("sha256").update(masterKey).digest();
    }

    private static wrapKey(fileKey: Buffer): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv("aes-256-gcm", File.getMasterKey(), iv);
        const encryptedKey = Buffer.concat([cipher.update(fileKey), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return `${iv.toString("hex")}:${authTag.toString("hex")}:${encryptedKey.toString("hex")}`;
    }

    private static unwrapKey(wrappedKey: string): Buffer {
        const [ivHex, authTagHex, encryptedKeyHex] = wrappedKey.split(":");
        if (!ivHex || !authTagHex || !encryptedKeyHex) {
            throw new Error("Invalid encrypted file key");
        }

        const decipher = crypto.createDecipheriv("aes-256-gcm", File.getMasterKey(), Buffer.from(ivHex, "hex"));
        decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

        return Buffer.concat([
            decipher.update(Buffer.from(encryptedKeyHex, "hex")),
            decipher.final(),
        ]);
    }


    /**
     * 
     * @param file 
     * @returns 
     */
    public static async encrypt(file: Express.Multer.File | string, outputDir = "nas_storage") {
        const inputPath = typeof file === "string" ? file : file.path;

        const filekey = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        const outputFileName = `${crypto.randomUUID()}.enc`;
        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, outputFileName);

        const cipher = crypto.createCipheriv("aes-256-gcm", filekey, iv);
        await pipeline(
            createReadStream(inputPath),
            cipher,
            createWriteStream(outputPath, { flags: "wx" })
        );
        const authTag = cipher.getAuthTag();
        const encKey = File.wrapKey(filekey);

        return { iv, encKey, authTag, outputFileName, outputPath };
    };

    /**
     * 
     * @param file 
     * @param originalFileId 
     * @param folderId 
     * @param userId 
     * @returns 
     */
    public static async encryptSave(
        file: Express.Multer.File | string,
        originalFileId: number | null,
        folderId: number,
        userId: number,
        scan?: { status: "clean" | "infected" | "failed", engine: string, result: string },
    ) {
        const inputPath = typeof file === "string" ? file : file.path;
        let fileSize: number;

        if (typeof file === "string"){
            const fileStat = await fs.stat(file);
            fileSize = fileStat.size;
        } else {
            fileSize = file.size;
        }

        const disk = await Disk.DiskWithMostSpace(fileSize);
        if (!disk) return { success: false, message : "Aucun disque disponible avec suffisamment d'espace libre"};

        const { iv, encKey, authTag, outputFileName, outputPath } = await File.encrypt(inputPath, disk.path);

        const createdFile = await File.create({
            orignalFileId: originalFileId,
            folderId,
            ownerId: userId,
            diskId: disk.diskId,
            fileName: outputFileName,
            originalName: typeof file === "string" ? path.basename(file) : file.originalname,
            filePath: outputPath,
            type: path.extname(typeof file === "string" ? inputPath : file.originalname).toLowerCase(),
            iv: iv.toString("hex"),
            encKey,
            authTag: authTag.toString("hex"),
            scanStatus: scan?.status || "pending",
            scanEngine: scan?.engine || null,
            scanResult: scan?.result || null,
            scannedAt: scan ? new Date() : null,
        } as File);

        return { success: true, createdFile };
    };

    /**
     * 
     * @returns 
     */
    public async decrypt(): Promise<Buffer> {
        const fileKey = File.unwrapKey(this.encKey);

        const encryptedData = await fs.readFile(this.filePath);

        const decipher = crypto.createDecipheriv("aes-256-gcm", fileKey, Buffer.from(this.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(this.authTag, "hex"));

        const decryptedData = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final(),
        ]);

        return decryptedData;
    };
}

/**
 * Initialise le modèle File avec Sequelize.
 */
File.init(
    {
        fileId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        orignalFileId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: "Files",
                key: "fileId",
            },
        },
        folderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Folders",
                key: "folderId",
            },
            onDelete: "CASCADE",
        },
        ownerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Users",
                key: "userId",
            },
            onDelete: "CASCADE",
        },
        diskId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Disks",
                key: "diskId",
            },
            onDelete: "CASCADE",
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        originalName: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        filePath: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        iv: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        encKey: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        authTag: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        scanStatus: {
            type: DataTypes.ENUM("pending", "clean", "infected", "failed"),
            allowNull: false,
            defaultValue: "pending",
        },
        scanEngine: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        scanResult: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        scannedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "File",
        tableName: "Files",
        timestamps: true,
        hooks: {
            beforeCreate: async (file: File) => {
                file.originalName = encryptMetadata(file.originalName);
            },
            beforeUpdate: async (file: File) => {
                if (file.changed("originalName")) {
                    file.originalName = encryptMetadata(file.originalName);
                }
            },
            afterCreate: async (file: File) => {
                const fileStat = await fs.stat(file.filePath);
                const disk = await Disk.findByPk(file.diskId);

                await disk?.update({ freeSpace: disk.freeSpace - fileStat.size });
            },
            beforeDestroy: async (file: File) => {
                const fileStat = await fs.stat(file.filePath);
                const disk = await Disk.findByPk(file.diskId);

                await disk?.update({ freeSpace: disk.freeSpace + fileStat.size });
            },
        },
    });


export { File };
