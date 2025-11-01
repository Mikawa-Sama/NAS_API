import { IUser } from "./interfaces";

declare global {
    namespace Express {
        // interface User extends IUser { }

        interface Request {
            user: IUser;
        }
    }
} 