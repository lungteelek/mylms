declare class BulkKnowledgeBaseDocumentItemDto {
    lessonNodeId?: string;
    sourceType: 'pdf' | 'docx' | 'slide' | 'transcript' | 'note' | 'html';
    title: string;
    fileUrl: string;
    extractedText?: string;
}
export declare class BulkCreateKnowledgeBaseDocumentsDto {
    documents: BulkKnowledgeBaseDocumentItemDto[];
}
export {};
