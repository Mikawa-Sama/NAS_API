export interface IFile {
    fileId: number;
    folderId: number;
    fileName: string;
    originalPath: string;
    filePath: string;
    type: string;
    createdAt?: Date;
    updatedAt?: Date;
}