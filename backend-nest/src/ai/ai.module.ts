import { forwardRef, Module } from '@nestjs/common';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { AiTutorController } from './ai-tutor.controller';
import { AiService } from './ai.service';
import { OpenAiProvider } from './openai.provider';

@Module({
  imports: [forwardRef(() => KnowledgeBaseModule)],
  controllers: [AiTutorController],
  providers: [AiService, OpenAiProvider],
  exports: [OpenAiProvider],
})
export class AiModule {}
