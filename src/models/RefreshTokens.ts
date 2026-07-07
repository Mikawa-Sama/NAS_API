import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../config/database";
import { IRefreshToken } from "../interfaces"
import { User } from "./Users";

/**
 * Modèle Sequelize pour les tokens de rafraîchissement.
 * @extends Model<IRefreshToken>
 */
type RefreshTokenCreationAttributes = Optional<IRefreshToken, never>;

class RefreshToken extends Model<IRefreshToken, RefreshTokenCreationAttributes> implements IRefreshToken {
    public token!: string;
    public userId!: number;
    public deviceId!: number;
    public expiresAt!: Date;
}

/**
 * Initialise le modèle RefreshToken avec Sequelize.
 */
RefreshToken.init(
    {
        token: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Users",
                key: "userId"
            },
            onDelete: "CASCADE",
        },
        deviceId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "UserDevices",
                key: "deviceId"
            },
            onDelete: "CASCADE",
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: 'RefreshToken',
        tableName: "RefreshTokens",
        timestamps: false,
    }
);


export { RefreshToken };

