export interface IFolderAccess {
    folderAccessId: number;
    folderId: number;
    userId: number;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
