import { forwardRef, Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseIngestionService } from './knowledge-base-ingestion.service';
import { KnowledgeBaseRepository } from './knowledge-base.repository';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, KnowledgeBaseRepository, KnowledgeBaseIngestionService],
  exports: [KnowledgeBaseService, KnowledgeBaseRepository, KnowledgeBaseIngestionService],
})
export class KnowledgeBaseModule {}
