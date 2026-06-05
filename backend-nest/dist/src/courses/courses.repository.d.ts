import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonAssetDto } from './dto/create-lesson-asset.dto';
import { UpsertLessonTranscriptDto } from './dto/upsert-lesson-transcript.dto';
import { UpdateLessonNodeDto } from './dto/update-lesson-node.dto';
import { UpsertLessonContentDto } from './dto/upsert-lesson-content.dto';
import { CourseRow, LessonAssetRow, LessonNodeRow, LessonTranscriptRow } from './types/course.types';
export declare class CoursesRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createCourse(tenantId: string, body: CreateCourseDto): Promise<CourseRow>;
    findCourseById(tenantId: string, courseId: string): Promise<CourseRow | null>;
    listLessonNodes(tenantId: string, courseId: string): Promise<LessonNodeRow[]>;
    listLessonAssets(tenantId: string, courseId: string): Promise<LessonAssetRow[]>;
    listLessonTranscripts(tenantId: string, courseId: string): Promise<LessonTranscriptRow[]>;
    createLessonNode(tenantId: string, courseId: string, payload: {
        parentId: string | null;
        nodeType: LessonNodeRow['nodeType'];
        title: string;
        path: string;
        depth: number;
        sortOrder: number;
        estimatedMinutes: number;
    }): Promise<LessonNodeRow>;
    updateLessonNode(tenantId: string, lessonNodeId: string, body: UpdateLessonNodeDto): Promise<void>;
    upsertLessonContent(lessonNodeId: string, body: UpsertLessonContentDto): Promise<string>;
    upsertLessonTranscript(lessonNodeId: string, body: UpsertLessonTranscriptDto): Promise<string>;
    createLessonAsset(lessonNodeId: string, body: CreateLessonAssetDto): Promise<string>;
    createVideoAsset(lessonNodeId: string): Promise<string>;
    deleteCourseTree(tenantId: string, courseId: string): Promise<void>;
    deleteLessonNodeTree(tenantId: string, lessonNodeId: string): Promise<void>;
    publishCourse(tenantId: string, courseId: string): Promise<void>;
    applyTreeMoves(tenantId: string, courseId: string, updates: Array<{
        nodeId: string;
        parentId: string | null;
        sortOrder: number;
        depth: number;
        path: string;
    }>): Promise<void>;
}
