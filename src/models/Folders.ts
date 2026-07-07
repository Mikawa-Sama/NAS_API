import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { IFolder } from '../interfaces';
import { FolderAccess } from './FoldersAccess';
import bcrypt from 'bcrypt';
import { encryptMetadata } from '../utils/metadataCrypto';

/** 
* Folder model
* @extends Model<IFolder>
*/

type FolderCreationAttributes = Optional<IFolder, "folderId" | "password" | "isPublic" | "createdAt" | "updatedAt">;

class Folder extends Model<IFolder, FolderCreationAttributes> implements IFolder {
    public folderId!: number;
    public name!: string;
    public parentFolderId!: number;
    public password?: string;
    public isPublic!: boolean;
    public ownerId!: number;
    public readonly createdAt!: Date;
    public updatedAt!: Date;

    /**
     * Checks if a user is the owner of a folder
     * @param userId - The user's ID
     * @returns {boolean} - True if the user is the owner of the folder, false otherwise
     */
    public isOwner(userId: number): boolean {
        return this.ownerId === userId;
    };

    /**
     * Checks if a user is authorized to access a folder
     * @param userId - The user's ID
     * @returns {boolean} - True if the user is authorized to access the folder, false otherwise
     */
    public async isAccessibleBy(userId: number): Promise<boolean> {
        if (this.isPublic || this.isOwner(userId)) return true

        const access = await FolderAccess.findOne({ 
            where: { folderId: this.folderId, userId, canView: true } 
        });
        return !!access;
    };

    /**
     * Checks if a user has a specific permission for a folder
     * @param userId - The user's ID
     * @param permission - The permission to check for
     * @returns {boolean} - True if the user has the permission, false otherwise
     */
    public async hasFolderPermission(userId: number, permission: "canView" | "canEdit" | "canDelete"): Promise<boolean> {
        if (this.isOwner(userId)) return true;

        const access = await FolderAccess.findOne({ 
            where: { folderId: this.folderId, userId, [permission]: true } 
        });
        return !!access;
    };
}

/*
* Folder model initialization
*/
Folder.init({
    folderId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    parentFolderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
}, {
    sequelize,
    modelName: 'Folder',
    tableName: 'Folders',
    timestamps: true,
    hooks: {
        /**
        * Set isPublic to false if it is undefined or null
        * @param folder - The folder to set the isPublic property for
        */
        beforeCreate: async (folder: Folder) => {
            folder.name = encryptMetadata(folder.name) || folder.name;
            if (folder.isPublic === undefined || folder.isPublic === null) {
                folder.isPublic = false;
            }
            if (folder.password) {
                folder.password = await bcrypt.hash(folder.password, 12);
            }
        },
        beforeUpdate: async (folder: Folder) => {
            if (folder.changed("name")) {
                folder.name = encryptMetadata(folder.name) || folder.name;
            }
            if (folder.changed("password") && folder.password) {
                folder.password = await bcrypt.hash(folder.password, 12);
            }
        }
    },
});


export { Folder };
