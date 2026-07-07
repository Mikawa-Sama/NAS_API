export interface IAccountAccessLog {
    accountAccessLogId: number;
    userId?: number | null;
    deviceId?: number | null;
    username: string;
    action: "login_success" | "login_failure" | "logout" | "refresh";
    ipAddress: string;
    userAgent: string;
    location?: string | null;
    createdAt?: Date;
}
