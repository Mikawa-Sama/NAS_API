export interface IUser {
    userId: number;
    username: string;
    password: string;
    isAdmin: boolean;
    mfaEnabled: boolean;
    mfaSecret?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
