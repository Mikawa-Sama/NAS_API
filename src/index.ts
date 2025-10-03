import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { intitDatabase } from "./config/database";
import routes from './routes/'


const app: Application = express();

app.use(cors());
app.use(bodyParser.json());

app.use(routes);

(async () => { 
    await intitDatabase();

    app.listen(process.env.SERVER_PORT || 3000, () => {
        console.log('Server is running...');
    });
})();

