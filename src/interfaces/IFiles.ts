export interface IFile {
    fileId: number;
    orignalFileId?: number | null;
    folderId: number;
    ownerId: number;
    diskId: number;
    fileName: string;
    originalName?: string | null;
    filePath: string;
    type: string;
    iv: string;
    encKey: string;
    authTag: string;
    scanStatus: "pending" | "clean" | "infected" | "failed";
    scanEngine?: string | null;
    scanResult?: string | null;
    scannedAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}
