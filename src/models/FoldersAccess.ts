import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import { IFolderAccess } from '../interfaces';
import { Folder } from './Folders';

/** 
* FolderAccess model
* @extends Model<IFolderAccess>
*/
type FolderAccessCreationAttributes = Optional<IFolderAccess, "folderAccessId" | "canView" | "canEdit" | "canDelete" | "createdAt" | "updatedAt">;

class FolderAccess extends Model<IFolderAccess, FolderAccessCreationAttributes> implements IFolderAccess {
    public folderAccessId!: number;
    public folderId!: number;
    public userId!: number;
    public canView!: boolean;
    public canEdit!: boolean;
    public canDelete!: boolean;
    public readonly createdAt!: Date;
    public updatedAt!: Date;
}

/*
* FolderAccess model initialization
*/
FolderAccess.init({
    folderAccessId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
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
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "userId",
        },
        onDelete: "CASCADE",
    },
    canView: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    canEdit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    canDelete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    sequelize,
    modelName: 'FolderAccess',
    tableName: 'FoldersAccess',
    timestamps: true,
    hooks: {
        /**
        * Set canView, canEdit, and canDelete to false if they are undefined or null
        * @param folderAccess - The folder access to set the properties for
        */
        beforeCreate: async (folderAccess: FolderAccess) => {
            if (folderAccess.canView === undefined || folderAccess.canView === null) {
                folderAccess.canView = true;
            }
            if (folderAccess.canEdit === undefined || folderAccess.canEdit === null) {
                folderAccess.canEdit = false;
            }
            if (folderAccess.canDelete === undefined || folderAccess.canDelete === null) {
                folderAccess.canDelete = false;
            }
        }
    },
});


export { FolderAccess };
