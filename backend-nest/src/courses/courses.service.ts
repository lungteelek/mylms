import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';
import { buildLessonTree, createNodePath, ensureNoTreeCycles } from './course-tree.util';
import { CoursesRepository } from './courses.repository';
import { CreateCourseDto } from './dto/create-course.dto';
import { ReorderTreeDto } from './dto/reorder-tree.dto';
import { LessonAssetRow, LessonNodeTree, LessonTranscriptRow } from './types/course.types';

@Injectable()
export class CoursesService {
  constructor(private readonly coursesRepository: CoursesRepository) {}

  async listCourses(user: RequestContext) {
    const items = await this.coursesRepository.listCourses(user.tenantId);
    return {
      data: {
        items,
      },
    };
  }

  async createCourse(user: RequestContext, body: CreateCourseDto) {
    const course = await this.coursesRepository.createCourse(user.tenantId, body);
    return {
      data: course,
    };
  }

  async getCourseTree(user: RequestContext, courseId: string) {
    const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const nodes = await this.coursesRepository.listLessonNodes(user.tenantId, courseId);
    const assets = await this.coursesRepository.listLessonAssets(user.tenantId, courseId);
    const transcripts = await this.coursesRepository.listLessonTranscripts(user.tenantId, courseId);
    return {
      data: {
        course,
        nodes: this.attachTranscripts(this.attachAssets(buildLessonTree(nodes), assets), transcripts),
      },
    };
  }

  async reorderTree(user: RequestContext, courseId: string, body: ReorderTreeDto) {
    const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const nodes = await this.coursesRepository.listLessonNodes(user.tenantId, courseId);
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    const updates = body.moves.map((move) => {
      const currentNode = nodeMap.get(move.nodeId);
      if (!currentNode) {
        throw new NotFoundException(`Lesson node ${move.nodeId} not found`);
      }

      ensureNoTreeCycles(move.nodeId, move.newParentId, nodeMap);
      const parent = move.newParentId ? nodeMap.get(move.newParentId) ?? null : null;
      const nextDepth = parent ? parent.depth + 1 : 0;
      const nextPath = createNodePath(parent?.path ?? null, currentNode.title);

      nodeMap.set(move.nodeId, {
        ...currentNode,
        parentId: move.newParentId ?? null,
        sortOrder: move.newSortOrder,
        depth: nextDepth,
        path: nextPath,
      });

      return {
        nodeId: move.nodeId,
        parentId: move.newParentId ?? null,
        sortOrder: move.newSortOrder,
        depth: nextDepth,
        path: nextPath,
      };
    });

    await this.coursesRepository.applyTreeMoves(user.tenantId, courseId, updates);
    return {
      data: {
        courseId,
        updated: updates.length,
      },
    };
  }

  async publishCourse(user: RequestContext, courseId: string) {
    const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.coursesRepository.publishCourse(user.tenantId, courseId);
    return {
      data: {
        id: courseId,
        status: 'published',
        publishedAt: new Date().toISOString(),
      },
    };
  }

  async deleteCourseTree(user: RequestContext, courseId: string) {
    const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.coursesRepository.deleteCourseTree(user.tenantId, courseId);
    return {
      data: {
        courseId,
        deleted: true,
      },
    };
  }

  private attachAssets(nodes: LessonNodeTree[], assets: LessonAssetRow[]): LessonNodeTree[] {
    const assetByNodeId = new Map<string, LessonAssetRow[]>();
    for (const asset of assets) {
      const list = assetByNodeId.get(asset.lessonNodeId) || [];
      list.push(asset);
      assetByNodeId.set(asset.lessonNodeId, list);
    }

    const pickAsset = (rows: LessonAssetRow[]) => {
      const pdf = rows.find((asset) => asset.assetType === 'pdf');
      if (pdf) {
        return {
          type: 'pdf' as const,
          fileName: pdf.title || 'PDF asset',
          url: pdf.fileUrl || '',
          fileUrl: pdf.fileUrl || undefined,
          mimeType: pdf.mimeType,
          sizeBytes: pdf.sizeBytes,
        };
      }

      const link = rows.find((asset) => asset.assetType === 'link' && asset.externalUrl);
      if (link) {
        return {
          type: 'url' as const,
          fileName: '',
          url: link.externalUrl || '',
          externalUrl: link.externalUrl || undefined,
        };
      }

      return {
        type: 'none' as const,
        fileName: '',
        url: '',
      };
    };

    return nodes.map((node) => ({
      ...node,
      asset: pickAsset(assetByNodeId.get(node.id) || []),
      children: this.attachAssets(node.children || [], assets),
    }));
  }

  private attachTranscripts(nodes: LessonNodeTree[], transcripts: LessonTranscriptRow[]): LessonNodeTree[] {
    const transcriptByNodeId = new Map<string, LessonTranscriptRow>(transcripts.map((transcript) => [transcript.lessonNodeId, transcript]));

    const applyTranscripts = (tree: LessonNodeTree[]): LessonNodeTree[] =>
      tree.map((node) => {
        const transcript = transcriptByNodeId.get(node.id);
        return {
          ...node,
          transcriptLanguage: transcript?.language,
          transcriptStatus: transcript?.status,
          transcriptFullText: transcript?.fullText ?? null,
          transcriptSegments: transcript?.segments || [],
          children: applyTranscripts(node.children || []),
        };
      });

    return applyTranscripts(nodes);
  }
}
