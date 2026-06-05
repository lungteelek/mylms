"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonNodesService = void 0;
const common_1 = require("@nestjs/common");
const course_tree_util_1 = require("./course-tree.util");
const courses_repository_1 = require("./courses.repository");
let LessonNodesService = class LessonNodesService {
    constructor(coursesRepository) {
        this.coursesRepository = coursesRepository;
    }
    async createNode(user, courseId, body) {
        const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        const nodes = await this.coursesRepository.listLessonNodes(user.tenantId, courseId);
        const parent = body.parentId ? nodes.find((node) => node.id === body.parentId) : undefined;
        const siblingCount = nodes.filter((node) => (node.parentId ?? null) === (body.parentId ?? null)).length;
        const node = await this.coursesRepository.createLessonNode(user.tenantId, courseId, {
            parentId: body.parentId ?? null,
            nodeType: body.nodeType,
            title: body.title,
            path: (0, course_tree_util_1.createNodePath)(parent?.path ?? null, body.title),
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
    async updateNode(user, lessonNodeId, body) {
        await this.coursesRepository.updateLessonNode(user.tenantId, lessonNodeId, body);
        return { data: { lessonNodeId, ...body } };
    }
    async upsertContent(_user, lessonNodeId, body) {
        const contentId = await this.coursesRepository.upsertLessonContent(lessonNodeId, body);
        return { data: { id: contentId, lessonNodeId, ...body } };
    }
    async upsertTranscript(_user, lessonNodeId, body) {
        const transcriptId = await this.coursesRepository.upsertLessonTranscript(lessonNodeId, body);
        return { data: { id: transcriptId, lessonNodeId, ...body } };
    }
    async createAsset(_user, lessonNodeId, body) {
        const assetId = await this.coursesRepository.createLessonAsset(lessonNodeId, body);
        return { data: { id: assetId, lessonNodeId, ...body } };
    }
    async createUploadUrl(_user, lessonNodeId, body) {
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
    async deleteNode(user, lessonNodeId) {
        await this.coursesRepository.deleteLessonNodeTree(user.tenantId, lessonNodeId);
        return {
            data: {
                lessonNodeId,
                deleted: true,
            },
        };
    }
};
exports.LessonNodesService = LessonNodesService;
exports.LessonNodesService = LessonNodesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [courses_repository_1.CoursesRepository])
], LessonNodesService);
