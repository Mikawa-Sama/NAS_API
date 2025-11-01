import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database";
import { IFile } from "../interfaces";
import { Folder } from "./Folders";

/**
 * File model
 * @extends Model<IFile>
 */
class File extends Model<IFile> implements IFile {
    public fileId!: number;
    public folderId!: number;
    public fileName!: string;
    public originalPath!: string;
    public filePath!: string;
    public type!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
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
        folderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Folders",
                key: "folderId",
            },
            onDelete: "CASCADE",
        },
        fileName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        originalPath: {
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
    },
    {
        sequelize,
        modelName: "File",
        tableName: "Files",
        timestamps: true,
});


export { File };