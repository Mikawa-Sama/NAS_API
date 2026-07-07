import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { intitDatabase } from "./config/database";
import routes from './routes/';
import { csrfProtection, securityHeaders } from "./utils";


const app: Application = express();
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(securityHeaders);
app.use(cors({
    origin: corsOrigin.split(",").map((origin) => origin.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
}));
app.use(bodyParser.json({ limit: "256kb" }));
app.use(csrfProtection);

app.use(routes);

(async () => { 
    await intitDatabase();

    app.listen(process.env.SERVER_PORT || 3000, () => {
        console.log('Server is running...');
    });
})();

