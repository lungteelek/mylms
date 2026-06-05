import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import aiConfig from './config/ai.config';
import billingConfig from './config/billing.config';
import databaseConfig from './config/database.config';
import mediaConfig from './config/media.config';
import queueConfig from './config/queue.config';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { PlannerModule } from './planner/planner.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { AiModule } from './ai/ai.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { MediaModule } from './media/media.module';
import { JobsModule } from './jobs/jobs.module';
import { SchemaBootstrapService } from './bootstrap/schema-bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, aiConfig, billingConfig, mediaConfig, queueConfig],
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    CoursesModule,
    MediaModule,
    PlannerModule,
    AiModule,
    KnowledgeBaseModule,
    JobsModule,
  ],
  providers: [SchemaBootstrapService],
})
export class AppModule {
  constructor(private readonly _schemaBootstrapService: SchemaBootstrapService) {}
}
