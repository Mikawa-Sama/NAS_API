import { Sequelize } from "sequelize";
import dotenv from 'dotenv';

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
        
        await sequelize.sync();
        console.log("Models synchronized with the database !");
      } catch (error) {
        console.error("Unable to connect to the database :", error);
      }
}
export default sequelize;