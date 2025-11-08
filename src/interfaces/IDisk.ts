export interface IDisk {
    diskId: number;
    name: string;
    path: string;
    capacity: number;
    freeSpace: number;
    createdAt?: Date;
    updatedAt?: Date;
}