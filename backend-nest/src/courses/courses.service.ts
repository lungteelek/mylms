import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';
import { buildLessonTree, createNodePath, ensureNoTreeCycles, ensureValidNodePlacement } from './course-tree.util';
import { CoursesRepository } from './courses.repository';
import { CreateCourseDto } from './dto/create-course.dto';
import { ReorderCoursesDto } from './dto/reorder-courses.dto';
import { ReorderTreeDto } from './dto/reorder-tree.dto';
import { LessonAssetRow, LessonNodeAssetItem, LessonNodeTree, LessonTranscriptRow } from './types/course.types';
import { syncCourseMarker } from './media-marker.util';

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
    const tenantSlug = await this.coursesRepository.findTenantSlug(user.tenantId);
    if (tenantSlug) {
      await syncCourseMarker({
        tenantSlug,
        courseId: course.id,
        nextTitle: course.title,
      }).catch((error) => {
        console.error('Failed to sync course marker after create:', error);
      });
    }
    return {
      data: course,
    };
  }

  async reorderCourses(user: RequestContext, body: ReorderCoursesDto) {
    const updated = await this.coursesRepository.reorderCourses(user.tenantId, body.orderedCourseIds);
    return {
      data: {
        updated,
      },
    };
  }

  async updateCourse(user: RequestContext, courseId: string, body: Partial<CreateCourseDto>) {
    const current = await this.coursesRepository.findCourseById(user.tenantId, courseId);
    if (!current) {
      throw new NotFoundException('Course not found');
    }

    const updated = await this.coursesRepository.updateCourse(user.tenantId, courseId, {
      title: body.title ?? null,
      description: body.description ?? null,
      subject: body.subject ?? null,
      level: body.level ?? null,
    });

    if (updated?.title) {
      const tenantSlug = await this.coursesRepository.findTenantSlug(user.tenantId);
      if (tenantSlug) {
        await syncCourseMarker({
          tenantSlug,
          courseId,
          previousTitle: current.title,
          nextTitle: updated.title,
        }).catch((error) => {
          console.error('Failed to sync course marker after rename:', error);
        });
      }
    }

    return {
      data: updated,
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
      if (move.newParentId && !parent) {
        throw new NotFoundException(`Lesson node ${move.newParentId} not found`);
      }
      ensureValidNodePlacement(currentNode.nodeType, move.newParentId ?? null, parent);
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

  async unpublishCourse(user: RequestContext, courseId: string) {
    const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.coursesRepository.unpublishCourse(user.tenantId, courseId);
    return {
      data: {
        id: courseId,
        status: 'draft',
        publishedAt: null,
      },
    };
  }

  async deleteCourse(user: RequestContext, courseId: string) {
    const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.coursesRepository.deleteCourse(user.tenantId, courseId);
    return {
      data: {
        courseId,
        deleted: true,
      },
    };
  }

  private attachAssets(nodes: LessonNodeTree[], assets: LessonAssetRow[]): LessonNodeTree[] {
    const assetByNodeId = new Map<string, LessonNodeAssetItem[]>();
    for (const asset of assets) {
      const list = assetByNodeId.get(asset.lessonNodeId) || [];
      list.push({
        id: asset.id,
        title: asset.title,
        assetType: asset.assetType,
        type:
          asset.assetType === 'pdf'
            ? 'pdf'
            : asset.assetType === 'image'
              ? 'image'
              : asset.assetType === 'attachment'
                ? 'attachment'
                : 'url',
        fileName: asset.title,
        url: asset.fileUrl || asset.externalUrl || '',
        fileUrl: asset.fileUrl || undefined,
        externalUrl: asset.externalUrl || undefined,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      });
      assetByNodeId.set(asset.lessonNodeId, list);
    }

    const pickAsset = (rows: LessonNodeAssetItem[]) => {
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

      const image = rows.find((asset) => asset.type === 'image' && asset.fileUrl);
      if (image) {
        return {
          type: 'image' as const,
          fileName: image.title || 'Image asset',
          url: image.fileUrl || '',
          fileUrl: image.fileUrl || undefined,
          mimeType: image.mimeType,
          sizeBytes: image.sizeBytes,
        };
      }

      const attachment = rows.find((asset) => asset.type === 'attachment' && asset.fileUrl);
      if (attachment) {
        return {
          type: 'attachment' as const,
          fileName: attachment.title || 'Attachment asset',
          url: attachment.fileUrl || '',
          fileUrl: attachment.fileUrl || undefined,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
        };
      }

      const link = rows.find((asset) => asset.type === 'url' && asset.externalUrl);
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
      assets: assetByNodeId.get(node.id) || [],
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
