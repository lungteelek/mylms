import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';
import { createNodePath } from './course-tree.util';
import { CoursesRepository } from './courses.repository';
import { CreateLessonAssetDto } from './dto/create-lesson-asset.dto';
import { CreateLessonNodeDto } from './dto/create-lesson-node.dto';
import { CreateVideoUploadUrlDto } from './dto/create-video-upload-url.dto';
import { UpdateLessonNodeDto } from './dto/update-lesson-node.dto';
import { UpsertLessonContentDto } from './dto/upsert-lesson-content.dto';
import { UpsertLessonTranscriptDto } from './dto/upsert-lesson-transcript.dto';

@Injectable()
export class LessonNodesService {
  constructor(private readonly coursesRepository: CoursesRepository) {}

  async createNode(user: RequestContext, courseId: string, body: CreateLessonNodeDto) {
    const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const nodes = await this.coursesRepository.listLessonNodes(user.tenantId, courseId);
    const parent = body.parentId ? nodes.find((node) => node.id === body.parentId) : undefined;
    const siblingCount = nodes.filter((node) => (node.parentId ?? null) === (body.parentId ?? null)).length;
    const node = await this.coursesRepository.createLessonNode(user.tenantId, courseId, {
      parentId: body.parentId ?? null,
      nodeType: body.nodeType,
      title: body.title,
      path: createNodePath(parent?.path ?? null, body.title),
      depth: parent ? parent.depth + 1 : 0,
      sortOrder: siblingCount + 1,
      estimatedMinutes: body.estimatedMinutes || 0,
    });

    return {
      data: {
        ...node,
        children: [],
      },
    };
  }

  async updateNode(user: RequestContext, lessonNodeId: string, body: UpdateLessonNodeDto) {
    await this.coursesRepository.updateLessonNode(user.tenantId, lessonNodeId, body);
    return { data: { lessonNodeId, ...body } };
  }

  async upsertContent(_user: RequestContext, lessonNodeId: string, body: UpsertLessonContentDto) {
    const contentId = await this.coursesRepository.upsertLessonContent(lessonNodeId, body);
    return { data: { id: contentId, lessonNodeId, ...body } };
  }

  async upsertTranscript(_user: RequestContext, lessonNodeId: string, body: UpsertLessonTranscriptDto) {
    const transcriptId = await this.coursesRepository.upsertLessonTranscript(lessonNodeId, body);
    return { data: { id: transcriptId, lessonNodeId, ...body } };
  }

  async createAsset(_user: RequestContext, lessonNodeId: string, body: CreateLessonAssetDto) {
    const assetId = await this.coursesRepository.createLessonAsset(lessonNodeId, body);
    return { data: { id: assetId, lessonNodeId, ...body } };
  }

  async createUploadUrl(_user: RequestContext, lessonNodeId: string, body: CreateVideoUploadUrlDto) {
    const videoAssetId = await this.coursesRepository.createVideoAsset(lessonNodeId);
    return {
      data: {
        videoAssetId,
        lessonNodeId,
        fileName: body.fileName,
        uploadUrl: 'https://upload.example.com/stub-signed-url',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    };
  }

  async deleteNode(user: RequestContext, lessonNodeId: string) {
    await this.coursesRepository.deleteLessonNodeTree(user.tenantId, lessonNodeId);
    return {
      data: {
        lessonNodeId,
        deleted: true,
      },
    };
  }
}
