export declare class UploadKnowledgeBaseDocumentDto {
    lessonNodeId?: string;
    sourceType: 'pdf' | 'docx' | 'slide' | 'transcript' | 'note' | 'html';
    title: string;
    fileUrl: string;
    extractedText?: string;
}
