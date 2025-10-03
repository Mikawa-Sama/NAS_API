import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database";
import { IRefreshToken } from "../interfaces/refreshToken"

/**
 * Modèle Sequelize pour les tokens de rafraîchissement.
 * @extends Model<IRefreshToken>
 */
class RefreshToken extends Model<IRefreshToken> implements IRefreshToken {
    public token!: string;
    public userId!: number;
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

export default RefreshToken;

