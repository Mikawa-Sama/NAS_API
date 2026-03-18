import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcrypt';
import { IUser } from '../interfaces';


interface UserCreationAttribute extends Omit<IUser, 'userId'> {}

/** 
* User model
* @extends Model<IUser>
*/
class User extends Model<IUser, UserCreationAttribute> implements IUser {
    declare userId: number;
    declare username: string;
    declare password: string;
    declare readonly createdAt: Date;
    declare updatedAt: Date;

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
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
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
            user.password = await bcrypt.hash(user.password, 10);
        },
        /**
        * Hash password before updating user
        * @param user - The user to hash the password for
        */
        beforeUpdate: async (user: User) => {
            user.password = await bcrypt.hash(user.password, 10);
        },
    },
});

export { User };