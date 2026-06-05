import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { KnowledgeBaseIngestionService } from '../../knowledge-base/knowledge-base-ingestion.service';
import { IngestKbDocumentJob } from '../job.types';
export declare class KnowledgeBaseJobProcessor extends WorkerHost {
    private readonly knowledgeBaseIngestionService;
    constructor(knowledgeBaseIngestionService: KnowledgeBaseIngestionService);
    process(job: Job<IngestKbDocumentJob>): Promise<{
        documentId: string;
        status: string;
        chunksCreated: number;
    } | undefined>;
    handleIngestDocument(data: IngestKbDocumentJob): Promise<{
        documentId: string;
        status: string;
        chunksCreated: number;
    }>;
}
