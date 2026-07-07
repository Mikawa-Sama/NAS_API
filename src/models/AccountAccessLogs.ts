import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../config/database";
import { IAccountAccessLog } from "../interfaces";

type AccountAccessLogCreationAttributes = Optional<IAccountAccessLog, "accountAccessLogId" | "userId" | "location" | "createdAt">;

class AccountAccessLog extends Model<IAccountAccessLog, AccountAccessLogCreationAttributes> implements IAccountAccessLog {
    public accountAccessLogId!: number;
    public userId?: number | null;
    public deviceId?: number | null;
    public username!: string;
    public action!: "login_success" | "login_failure" | "logout" | "refresh";
    public ipAddress!: string;
    public userAgent!: string;
    public location?: string | null;
    public createdAt?: Date;
}

AccountAccessLog.init({
    accountAccessLogId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "Users",
            key: "userId",
        },
        onDelete: "SET NULL",
    },
    deviceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "UserDevices",
            key: "deviceId",
        },
        onDelete: "SET NULL",
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    action: {
        type: DataTypes.ENUM("login_success", "login_failure", "logout", "refresh"),
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
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: "AccountAccessLog",
    tableName: "AccountAccessLogs",
    timestamps: true,
    updatedAt: false,
});

export { AccountAccessLog };
