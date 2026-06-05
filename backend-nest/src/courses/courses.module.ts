import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { LessonNodesController } from './lesson-nodes.controller';
import { CoursesService } from './courses.service';
import { LessonNodesService } from './lesson-nodes.service';
import { CoursesRepository } from './courses.repository';

@Module({
  controllers: [CoursesController, LessonNodesController],
  providers: [CoursesService, LessonNodesService, CoursesRepository],
})
export class CoursesModule {}
