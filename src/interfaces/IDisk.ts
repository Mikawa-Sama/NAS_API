export interface IDisk {
    diskId: number;
    name: string;
    path: string;
    capacity: number;
    freeSpace: number;
    isEnabled: boolean;
    isHealthy: boolean;
    lastHealthCheckAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
