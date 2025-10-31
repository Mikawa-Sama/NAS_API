import { Sequelize } from "sequelize";
import dotenv from 'dotenv';
import { User, Folder, FolderAccess } from "../models"

dotenv.config();

/*
* Sequelize instance configuration
*/
const sequelize = new Sequelize(
    process.env.DB_NAME!,
    process.env.DB_USER!,
    process.env.DB_PASSWORD!,
    {
        host: process.env.DB_HOST!,
        port: Number(process.env.DB_PORT!),
        dialect: 'mariadb',
        logging: false,
    }
);  

/*
* Initialize database
*/
export const intitDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log("Successfully connected to the database !");
        
        await sequelize.sync({ alter: true });
        console.log("Models synchronized with the database !");
      } catch (error) {
        console.error("Unable to connect to the database :", error);
      }
}
export default sequelize;