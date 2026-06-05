import { Body, Controller, Delete, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../common/types/request-context.type';
import { LessonNodesService } from './lesson-nodes.service';
import { CreateLessonNodeDto } from './dto/create-lesson-node.dto';
import { CreateLessonAssetDto } from './dto/create-lesson-asset.dto';
import { CreateVideoUploadUrlDto } from './dto/create-video-upload-url.dto';
import { UpdateLessonNodeDto } from './dto/update-lesson-node.dto';
import { UpsertLessonContentDto } from './dto/upsert-lesson-content.dto';
import { UpsertLessonTranscriptDto } from './dto/upsert-lesson-transcript.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonNodesController {
  constructor(private readonly lessonNodesService: LessonNodesService) {}

  @Post('courses/:courseId/nodes')
  @Roles('owner', 'admin', 'tutor')
  createNode(@CurrentUser() user: RequestContext, @Param('courseId') courseId: string, @Body() body: CreateLessonNodeDto) {
    return this.lessonNodesService.createNode(user, courseId, body);
  }

  @Patch('lesson-nodes/:lessonNodeId')
  @Roles('owner', 'admin', 'tutor')
  updateNode(@CurrentUser() user: RequestContext, @Param('lessonNodeId') lessonNodeId: string, @Body() body: UpdateLessonNodeDto) {
    return this.lessonNodesService.updateNode(user, lessonNodeId, body);
  }

  @Put('lesson-nodes/:lessonNodeId/content')
  @Roles('owner', 'admin', 'tutor')
  upsertContent(@CurrentUser() user: RequestContext, @Param('lessonNodeId') lessonNodeId: string, @Body() body: UpsertLessonContentDto) {
    return this.lessonNodesService.upsertContent(user, lessonNodeId, body);
  }

  @Put('lesson-nodes/:lessonNodeId/transcript')
  @Roles('owner', 'admin', 'tutor')
  upsertTranscript(@CurrentUser() user: RequestContext, @Param('lessonNodeId') lessonNodeId: string, @Body() body: UpsertLessonTranscriptDto) {
    return this.lessonNodesService.upsertTranscript(user, lessonNodeId, body);
  }

  @Post('lesson-nodes/:lessonNodeId/assets')
  @Roles('owner', 'admin', 'tutor')
  createAsset(@CurrentUser() user: RequestContext, @Param('lessonNodeId') lessonNodeId: string, @Body() body: CreateLessonAssetDto) {
    return this.lessonNodesService.createAsset(user, lessonNodeId, body);
  }

  @Post('lesson-nodes/:lessonNodeId/videos/upload-url')
  @Roles('owner', 'admin', 'tutor')
  createUploadUrl(@CurrentUser() user: RequestContext, @Param('lessonNodeId') lessonNodeId: string, @Body() body: CreateVideoUploadUrlDto) {
    return this.lessonNodesService.createUploadUrl(user, lessonNodeId, body);
  }

  @Delete('lesson-nodes/:lessonNodeId')
  @Roles('owner', 'admin', 'tutor')
  deleteNode(@CurrentUser() user: RequestContext, @Param('lessonNodeId') lessonNodeId: string) {
    return this.lessonNodesService.deleteNode(user, lessonNodeId);
  }
}
