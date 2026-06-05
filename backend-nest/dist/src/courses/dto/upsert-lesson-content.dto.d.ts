export declare class UpsertLessonContentDto {
    contentType: 'video' | 'article' | 'pdf' | 'external_link' | 'mixed';
    htmlContent?: string;
    plainText?: string;
}
