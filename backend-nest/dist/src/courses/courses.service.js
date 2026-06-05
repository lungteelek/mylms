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
exports.CoursesService = void 0;
const common_1 = require("@nestjs/common");
const course_tree_util_1 = require("./course-tree.util");
const courses_repository_1 = require("./courses.repository");
let CoursesService = class CoursesService {
    constructor(coursesRepository) {
        this.coursesRepository = coursesRepository;
    }
    async createCourse(user, body) {
        const course = await this.coursesRepository.createCourse(user.tenantId, body);
        return {
            data: course,
        };
    }
    async getCourseTree(user, courseId) {
        const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        const nodes = await this.coursesRepository.listLessonNodes(user.tenantId, courseId);
        const assets = await this.coursesRepository.listLessonAssets(user.tenantId, courseId);
        const transcripts = await this.coursesRepository.listLessonTranscripts(user.tenantId, courseId);
        return {
            data: {
                course,
                nodes: this.attachTranscripts(this.attachAssets((0, course_tree_util_1.buildLessonTree)(nodes), assets), transcripts),
            },
        };
    }
    async reorderTree(user, courseId, body) {
        const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        const nodes = await this.coursesRepository.listLessonNodes(user.tenantId, courseId);
        const nodeMap = new Map(nodes.map((node) => [node.id, node]));
        const updates = body.moves.map((move) => {
            const currentNode = nodeMap.get(move.nodeId);
            if (!currentNode) {
                throw new common_1.NotFoundException(`Lesson node ${move.nodeId} not found`);
            }
            (0, course_tree_util_1.ensureNoTreeCycles)(move.nodeId, move.newParentId, nodeMap);
            const parent = move.newParentId ? nodeMap.get(move.newParentId) ?? null : null;
            const nextDepth = parent ? parent.depth + 1 : 0;
            const nextPath = (0, course_tree_util_1.createNodePath)(parent?.path ?? null, currentNode.title);
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
    async publishCourse(user, courseId) {
        const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
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
    async deleteCourseTree(user, courseId) {
        const course = await this.coursesRepository.findCourseById(user.tenantId, courseId);
        if (!course) {
            throw new common_1.NotFoundException('Course not found');
        }
        await this.coursesRepository.deleteCourseTree(user.tenantId, courseId);
        return {
            data: {
                courseId,
                deleted: true,
            },
        };
    }
    attachAssets(nodes, assets) {
        const assetByNodeId = new Map();
        for (const asset of assets) {
            const list = assetByNodeId.get(asset.lessonNodeId) || [];
            list.push(asset);
            assetByNodeId.set(asset.lessonNodeId, list);
        }
        const pickAsset = (rows) => {
            const pdf = rows.find((asset) => asset.assetType === 'pdf');
            if (pdf) {
                return {
                    type: 'pdf',
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
                    type: 'url',
                    fileName: '',
                    url: link.externalUrl || '',
                    externalUrl: link.externalUrl || undefined,
                };
            }
            return {
                type: 'none',
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
    attachTranscripts(nodes, transcripts) {
        const transcriptByNodeId = new Map(transcripts.map((transcript) => [transcript.lessonNodeId, transcript]));
        const applyTranscripts = (tree) => tree.map((node) => {
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
};
exports.CoursesService = CoursesService;
exports.CoursesService = CoursesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [courses_repository_1.CoursesRepository])
], CoursesService);
