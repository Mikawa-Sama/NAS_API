import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database";
import { IFileAccessLog } from "../interfaces";

/**
 * 
 */
class FileAccessLog extends Model<IFileAccessLog> implements IFileAccessLog {
    public logId!: number;
    public fileId!: number;
    public userId!: number;
    public action!: "create" | "view" | "download" | "edit" | "delete";
    public ipAddress!: string;
    public userAgent!: string;
    public createdAt?: Date | undefined;
}

FileAccessLog.init({
    logId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    fileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Files",
            key: "fileId",
        },
        onDelete: "CASCADE",
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "userId",
        },
        onDelete: "CASCADE",
    },
    action: {
        type: DataTypes.ENUM,
        allowNull: false,
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: false,
    },
},
    {
        sequelize,
        modelName: "FileAccessLog",
        tableName: "FileAccessLogs",
        timestamps: true,
        updatedAt: false,
    });

export { FileAccessLog };