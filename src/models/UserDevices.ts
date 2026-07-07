import { Model, DataTypes, Optional } from "sequelize";
import sequelize from "../config/database";
import { IUserDevice } from "../interfaces";

type UserDeviceCreationAttributes = Optional<IUserDevice, "deviceId" | "lastIpAddress" | "lastUsedAt" | "revokedAt" | "createdAt" | "updatedAt">;

class UserDevice extends Model<IUserDevice, UserDeviceCreationAttributes> implements IUserDevice {
    public deviceId!: number;
    public userId!: number;
    public name!: string;
    public userAgent!: string;
    public ipAddress!: string;
    public lastIpAddress!: string;
    public lastUsedAt!: Date;
    public revokedAt?: Date | null;
    public readonly createdAt!: Date;
    public updatedAt!: Date;
}

UserDevice.init({
    deviceId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lastIpAddress: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: "UserDevice",
    tableName: "UserDevices",
    timestamps: true,
    hooks: {
        beforeValidate: (device: UserDevice) => {
            if (!device.lastIpAddress) device.lastIpAddress = device.ipAddress;
            if (!device.lastUsedAt) device.lastUsedAt = new Date();
        },
    },
});

export { UserDevice };
