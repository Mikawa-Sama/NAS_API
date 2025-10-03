import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';
import { IFolder } from '../interfaces/Folder';

/** 
* Folder model
* @extends Model<IFolder>
*/

class Folder extends Model<IFolder> implements IFolder {
    public folderId!: number;
    public name!: string;
    public parentFolderId!: number;
    public password?: string;
    public isPublic!: boolean;
    public ownerId!: number;
    public readonly createdAt!: Date;
    public updatedAt!: Date;
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
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
            if (folder.isPublic === undefined || folder.isPublic === null) {
                folder.isPublic = false;
            }
        }
    },
});


export default Folder;