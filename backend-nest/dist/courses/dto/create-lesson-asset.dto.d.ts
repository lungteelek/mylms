export declare class CreateLessonAssetDto {
    assetType: 'pdf' | 'link' | 'image' | 'attachment';
    title: string;
    fileUrl?: string;
    externalUrl?: string;
    mimeType?: string;
    sizeBytes?: number;
}
