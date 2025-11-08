export interface IFolder {
    folderId: number;
    name: string;
    parentFolderId: number;
    password?: string;
    isPublic: boolean;
    ownerId: number;
    createdAt?: Date;
    updatedAt?: Date;
}
