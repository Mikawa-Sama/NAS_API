import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { IFolderAccess } from '../interfaces';
import { Folder } from './Folders';

/** 
* FolderAccess model
* @extends Model<IFolderAccess>
*/
class FolderAccess extends Model<IFolderAccess> implements IFolderAccess {
    public folderAccessId!: number;
    public folderId!: number;
    public userId!: number;
    public canView!: boolean;
    public canEdit!: boolean;
    public canDelete!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
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
    },
    canEdit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    canDelete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
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