export interface IRefreshToken {
    token: string,
    userId: number;
    deviceId: number;
    expiresAt: Date
}
