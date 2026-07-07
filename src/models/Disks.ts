import { Model, DataTypes, Op, Optional } from "sequelize";
import sequelize from "../config/database";
import { IDisk } from "../interfaces";

/**
 * 
 */
type DiskCreationAttributes = Optional<IDisk, "diskId" | "capacity" | "freeSpace" | "isEnabled" | "isHealthy" | "lastHealthCheckAt" | "createdAt" | "updatedAt">;

class Disk extends Model<IDisk, DiskCreationAttributes> implements IDisk {
    public diskId!: number;
    public name!: string;
    public path!: string;
    public capacity!: number;
    public freeSpace!: number;
    public isEnabled!: boolean;
    public isHealthy!: boolean;
    public lastHealthCheckAt?: Date | null;
    public readonly createdAt!: Date;
    public updatedAt!: Date;

    public static async DiskWithMostSpace(fileSize: number): Promise<Disk | null> {
        return await Disk.findOne({
            where: {
                freeSpace: { [Op.gte]: fileSize },
                isEnabled: true,
                isHealthy: true,
            },
            order: [["freeSpace", "DESC"]],
        });
    };
}

Disk.init(
    {
        diskId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        capacity: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
        },
        freeSpace: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0,
        },
        isEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        isHealthy: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        lastHealthCheckAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        modelName: "Disk",
        tableName: "Disks",
        timestamps: true,
    });

export { Disk };
