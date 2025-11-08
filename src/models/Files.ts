import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database";
import { IFile } from "../interfaces";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { Disk } from "./Disks";


/**
 * File model
 * @extends Model<IFile>
 */
class File extends Model<IFile> implements IFile {
    public fileId!: number;
    public orignalFileId?: number;
    public folderId!: number;
    public ownerId!: number;
    public diskId!: number;
    public fileName!: string;
    public filePath!: string;
    public type!: string;
    public iv!: string;
    public encKey!: string;
    public authTag!: string;
    public readonly createdAt!: Date;
    public updatedAt!: Date;

    private static MASTER_KEY = process.env.MASTER_KEY || "maximum encryption";


    /**
     * 
     * @param file 
     * @returns 
     */
    public static async encrypt(file: Express.Multer.File | string) {
        const inputPath = typeof file === "string" ? file : file.path;
        const originalName = typeof file === "string" ? path.basename(file) : file.originalname;

        const filekey = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-gcm", filekey, iv);
        const inputData = await fs.readFile(inputPath);


        const encryptData = Buffer.concat([cipher.update(inputData), cipher.final()]);
        const authTag = cipher.getAuthTag();

        const outputFileName = `${Date.now()}_${originalName}.enc`;
        const outputPath = path.join("nas_storage", outputFileName);

        await fs.writeFile(outputPath, encryptData);
        const encKey = crypto.publicEncrypt(File.MASTER_KEY, filekey);

        return { iv, encKey, authTag, encryptData, outputFileName, outputPath };
    };

    /**
     * 
     * @param file 
     * @param originalFileId 
     * @param folderId 
     * @param userId 
     * @returns 
     */
    public static async encryptSave(file: Express.Multer.File | string, originalFileId: number | null, folderId: number, userId: number) {
        const inputPath = typeof file === "string" ? file : file.path;
        const originalName = typeof file === "string" ? path.basename(file) : file.originalname;
        let fileSize: number;

        if (typeof file === "string"){
            const fileStat = await fs.stat(file);
            fileSize = fileStat.size;
        } else {
            fileSize = file.size;
        }

        const { iv, encKey, authTag, encryptData, outputFileName, outputPath } = await File.encrypt(inputPath);

        const disk = await Disk.DiskWithMostSpace(fileSize);
        if (!disk) return { success: false, message : "Aucun disque disponible avec suffisamment d'espace libre"};

        const createdFile = await File.create({
            orignalFileId: originalFileId,
            folderId,
            ownerId: userId,
            diskId: disk.diskId,
            fileName: outputFileName,
            filePath: outputPath,
            type: path.extname(inputPath).toLowerCase(),
            iv: iv.toString("hex"),
            encKey: encKey.toString("hex"),
            authTag: authTag.toString("hex")
        } as File);

        await fs.unlink(outputPath);

        return { success: true, createdFile };
    };

    /**
     * 
     * @returns 
     */
    public async decrypt(): Promise<Buffer> {
        const fileKey = crypto.privateDecrypt(File.MASTER_KEY, Buffer.from(this.encKey, "hex"));

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
    },
    {
        sequelize,
        modelName: "File",
        tableName: "Files",
        timestamps: true,
        hooks: {
            afterCreate: async (file: File) => {
                const fileStat = await fs.stat(file.filePath);
                const disk = await Disk.findByPk(file.diskId);

                await disk?.update({ freeSpace: disk.freeSpace - fileStat.size });
            },
            beforeDestroy: async (file: File) => {
                const fileStat = await fs.stat(file.filePath);
                const disk = await Disk.findByPk(file.diskId);

                await disk?.update({ freeSpace: disk.freeSpace - fileStat.size });
            },
        },
    });


export { File };