import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';
import { IUser } from '../interfaces';

/** 
* User model
* @extends Model<IUser>
*/
type UserCreationAttributes = Optional<IUser, "userId" | "isAdmin" | "mfaEnabled" | "mfaSecret" | "createdAt" | "updatedAt">;

class User extends Model<IUser, UserCreationAttributes> implements IUser {
    public userId!: number;
    public username!: string;
    public password!: string;
    public isAdmin!: boolean;
    public mfaEnabled!: boolean;
    public mfaSecret?: string | null;
    public readonly createdAt!: Date;
    public updatedAt!: Date;

    /**
     * Verify password
     * @param password - The password to verify
     * @returns A promise that resolves to a boolean
     */
    public verifyPassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }
}

/*
* User model initialization
*/
User.init({
    userId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    mfaEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    mfaSecret: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    hooks: {
        /**
        * Hash password before creating user
        * @param user - The user to hash the password for
        */
        beforeCreate: async (user: User) => {
            user.password = await bcrypt.hash(user.password, 12);
            if (user.isAdmin === undefined || user.isAdmin === null) {
                user.isAdmin = false;
            }
            if (user.mfaEnabled === undefined || user.mfaEnabled === null) {
                user.mfaEnabled = false;
            }
        },
        /**
        * Hash password before updating user
        * @param user - The user to hash the password for
        */
        beforeUpdate: async (user: User) => {
            if (user.changed("password")) {
                user.password = await bcrypt.hash(user.password, 12);
            }
        },
    },
});

export { User };
