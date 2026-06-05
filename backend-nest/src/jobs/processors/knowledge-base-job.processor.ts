import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { KnowledgeBaseIngestionService } from '../../knowledge-base/knowledge-base-ingestion.service';
import { IngestKbDocumentJob, JOB_NAMES, JOB_QUEUES } from '../job.types';

@Injectable()
@Processor(JOB_QUEUES.KNOWLEDGE_BASE)
export class KnowledgeBaseJobProcessor extends WorkerHost {
  constructor(private readonly knowledgeBaseIngestionService: KnowledgeBaseIngestionService) {
    super();
  }

  async process(job: Job<IngestKbDocumentJob>) {
    if (job.name !== JOB_NAMES.INGEST_KB_DOCUMENT) {
      return;
    }
    return this.handleIngestDocument(job.data);
  }

  async handleIngestDocument(data: IngestKbDocumentJob) {
    return this.knowledgeBaseIngestionService.ingestDocument(data.documentId, {
      fileText: data.fileText,
      localFilePath: data.localFilePath,
    });
  }
}
