export interface IUserDevice {
    deviceId: number;
    userId: number;
    name: string;
    userAgent: string;
    ipAddress: string;
    lastIpAddress: string;
    lastUsedAt: Date;
    revokedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
