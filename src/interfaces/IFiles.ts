export interface IFile {
    fileId: number;
    orignalFileId?: number;
    folderId: number;
    ownerId: number;
    diskId: number;
    fileName: string;
    filePath: string;
    type: string;
    iv: string;
    encKey: string;
    authTag: string;
    createdAt?: Date;
    updatedAt?: Date;
}