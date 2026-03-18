import express, { Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from 'cookie-parser';
import { intitDatabase } from "./config/database";
import routes from './routes/'
import * as driveList from "drivelist"
import { Disk } from "./models/Disks";


const app: Application = express();

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());


app.use(routes);

(async () => { 
    await intitDatabase();

    const drives = await driveList.list();
    drives.forEach(async drive => {
        console.log(drive)
        console.log(drive.mountpoints[0].path)
        const disk = await Disk.findOne({ where: { path: drive.mountpoints[0].path }});
    });

    app.listen(process.env.SERVER_PORT || 3000, () => {
        console.log('Server is running...');
    });
})();

