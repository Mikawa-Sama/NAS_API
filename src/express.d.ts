import { IUser } from "./interfaces/User";

declare global {
    namespace Express {
        interface User extends IUser { }

        interface Request {
            user?: IUser;
        }
    }
} 