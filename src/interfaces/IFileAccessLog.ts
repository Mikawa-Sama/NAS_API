export interface IFileAccessLog {
    logId: number;
    fileId: number;
    userId: number;
    action: "create" | "view" | "download" | "edit" | "delete";
    ipAddress: string;
    userAgent: string;
    createdAt?: Date
}