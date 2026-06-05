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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const bulk_create_knowledge_base_documents_dto_1 = require("./dto/bulk-create-knowledge-base-documents.dto");
const ingest_document_dto_1 = require("./dto/ingest-document.dto");
const knowledge_base_service_1 = require("./knowledge-base.service");
const create_knowledge_base_dto_1 = require("./dto/create-knowledge-base.dto");
const update_knowledge_base_document_dto_1 = require("./dto/update-knowledge-base-document.dto");
const upload_knowledge_base_document_dto_1 = require("./dto/upload-knowledge-base-document.dto");
let KnowledgeBaseController = class KnowledgeBaseController {
    constructor(knowledgeBaseService) {
        this.knowledgeBaseService = knowledgeBaseService;
    }
    listKnowledgeBases(user) {
        return this.knowledgeBaseService.listKnowledgeBases(user);
    }
    createKnowledgeBase(user, body) {
        return this.knowledgeBaseService.createKnowledgeBase(user, body);
    }
    createDocument(user, knowledgeBaseId, body) {
        return this.knowledgeBaseService.createDocument(user, knowledgeBaseId, body);
    }
    bulkCreateDocuments(user, knowledgeBaseId, body) {
        return this.knowledgeBaseService.bulkCreateDocuments(user, knowledgeBaseId, body);
    }
    ingestDocument(user, documentId, body) {
        return this.knowledgeBaseService.ingestDocument(user, documentId, body);
    }
    listDocuments(user, knowledgeBaseId) {
        return this.knowledgeBaseService.listDocuments(user, knowledgeBaseId);
    }
    deleteDocument(user, documentId) {
        return this.knowledgeBaseService.deleteDocument(user, documentId);
    }
    updateDocument(user, documentId, body) {
        return this.knowledgeBaseService.updateDocument(user, documentId, body);
    }
};
exports.KnowledgeBaseController = KnowledgeBaseController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KnowledgeBaseController.prototype, "listKnowledgeBases", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_knowledge_base_dto_1.CreateKnowledgeBaseDto]),
    __metadata("design:returntype", void 0)
], KnowledgeBaseController.prototype, "createKnowledgeBase", null);
__decorate([
    (0, common_1.Post)(':knowledgeBaseId/documents'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('knowledgeBaseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, upload_knowledge_base_document_dto_1.UploadKnowledgeBaseDocumentDto]),
    __metadata("design:returntype", void 0)
], KnowledgeBaseController.prototype, "createDocument", null);
__decorate([
    (0, common_1.Post)(':knowledgeBaseId/documents/bulk'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('knowledgeBaseId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, bulk_create_knowledge_base_documents_dto_1.BulkCreateKnowledgeBaseDocumentsDto]),
    __metadata("design:returntype", void 0)
], KnowledgeBaseController.prototype, "bulkCreateDocuments", null);
__decorate([
    (0, common_1.Post)('documents/:documentId/ingest'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('documentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, ingest_document_dto_1.IngestDocumentDto]),
    __metadata("design:returntype", void 0)
], KnowledgeBaseController.prototype, "ingestDocument", null);
__decorate([
    (0, common_1.Get)(':knowledgeBaseId/documents'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('knowledgeBaseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], KnowledgeBaseController.prototype, "listDocuments", null);
__decorate([
    (0, common_1.Delete)('documents/:documentId'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('documentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], KnowledgeBaseController.prototype, "deleteDocument", null);
__decorate([
    (0, common_1.Patch)('documents/:documentId'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('documentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_knowledge_base_document_dto_1.UpdateKnowledgeBaseDocumentDto]),
    __metadata("design:returntype", void 0)
], KnowledgeBaseController.prototype, "updateDocument", null);
exports.KnowledgeBaseController = KnowledgeBaseController = __decorate([
    (0, common_1.Controller)('knowledge-bases'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [knowledge_base_service_1.KnowledgeBaseService])
], KnowledgeBaseController);
