import { RequestContext } from '../common/types/request-context.type';
import { LessonNodesService } from './lesson-nodes.service';
import { CreateLessonNodeDto } from './dto/create-lesson-node.dto';
import { CreateLessonAssetDto } from './dto/create-lesson-asset.dto';
import { CreateVideoUploadUrlDto } from './dto/create-video-upload-url.dto';
import { UpdateLessonNodeDto } from './dto/update-lesson-node.dto';
import { UpsertLessonContentDto } from './dto/upsert-lesson-content.dto';
import { UpsertLessonTranscriptDto } from './dto/upsert-lesson-transcript.dto';
export declare class LessonNodesController {
    private readonly lessonNodesService;
    constructor(lessonNodesService: LessonNodesService);
    createNode(user: RequestContext, courseId: string, body: CreateLessonNodeDto): Promise<{
        data: {
            children: never[];
            id: string;
            parentId: string | null;
            nodeType: "section" | "lesson" | "quiz" | "assignment";
            title: string;
            path: string;
            depth: number;
            sortOrder: number;
            estimatedMinutes: number;
            isPublished: boolean;
        };
    }>;
    updateNode(user: RequestContext, lessonNodeId: string, body: UpdateLessonNodeDto): Promise<{
        data: {
            title?: string;
            estimatedMinutes?: number;
            isPublished?: boolean;
            lessonNodeId: string;
        };
    }>;
    upsertContent(user: RequestContext, lessonNodeId: string, body: UpsertLessonContentDto): Promise<{
        data: {
            contentType: "video" | "article" | "pdf" | "external_link" | "mixed";
            htmlContent?: string;
            plainText?: string;
            id: string;
            lessonNodeId: string;
        };
    }>;
    upsertTranscript(user: RequestContext, lessonNodeId: string, body: UpsertLessonTranscriptDto): Promise<{
        data: {
            language?: string;
            status?: "ready" | "processing" | "failed" | "uploading";
            fullText?: string;
            segments: Array<{
                seek: string;
                progress: number;
                text: string;
            }>;
            id: string;
            lessonNodeId: string;
        };
    }>;
    createAsset(user: RequestContext, lessonNodeId: string, body: CreateLessonAssetDto): Promise<{
        data: {
            assetType: "pdf" | "link" | "image" | "attachment";
            title: string;
            fileUrl?: string;
            externalUrl?: string;
            mimeType?: string;
            sizeBytes?: number;
            id: string;
            lessonNodeId: string;
        };
    }>;
    createUploadUrl(user: RequestContext, lessonNodeId: string, body: CreateVideoUploadUrlDto): Promise<{
        data: {
            videoAssetId: string;
            lessonNodeId: string;
            fileName: string;
            uploadUrl: string;
            expiresAt: string;
        };
    }>;
    deleteNode(user: RequestContext, lessonNodeId: string): Promise<{
        data: {
            lessonNodeId: string;
            deleted: boolean;
        };
    }>;
}
