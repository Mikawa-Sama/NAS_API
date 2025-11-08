import { Model, DataTypes, Op } from "sequelize";
import sequelize from "../config/database";
import { IDisk } from "../interfaces";

/**
 * 
 */
class Disk extends Model<IDisk> implements IDisk {
    public diskId!: number;
    public name!: string;
    public path!: string;
    public capacity!: number;
    public freeSpace!: number;
    public readonly createdAt!: Date;
    public updatedAt!: Date;

    public static async DiskWithMostSpace(fileSize: number): Promise<Disk | null> {
        return await Disk.findOne({
            where: {freeSpace: { [Op.gte]: fileSize}},
            order: [["freeSpace", "DESC"]],
        });
    };
}

Disk.init(
    {
        diskId: {
            type: DataTypes.INTEGER,
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
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        freeSpace: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        modelName: "Disk",
        tableName: "Disks",
        timestamps: true,
    });

export { Disk };