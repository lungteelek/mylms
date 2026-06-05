import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../common/types/request-context.type';
import { BulkCreateKnowledgeBaseDocumentsDto } from './dto/bulk-create-knowledge-base-documents.dto';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDocumentDto } from './dto/update-knowledge-base-document.dto';
import { UploadKnowledgeBaseDocumentDto } from './dto/upload-knowledge-base-document.dto';

@Controller('knowledge-bases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get()
  @Roles('owner', 'admin', 'tutor')
  listKnowledgeBases(@CurrentUser() user: RequestContext) {
    return this.knowledgeBaseService.listKnowledgeBases(user);
  }

  @Post()
  @Roles('owner', 'admin', 'tutor')
  createKnowledgeBase(@CurrentUser() user: RequestContext, @Body() body: CreateKnowledgeBaseDto) {
    return this.knowledgeBaseService.createKnowledgeBase(user, body);
  }

  @Post(':knowledgeBaseId/documents')
  @Roles('owner', 'admin', 'tutor')
  createDocument(
    @CurrentUser() user: RequestContext,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() body: UploadKnowledgeBaseDocumentDto,
  ) {
    return this.knowledgeBaseService.createDocument(user, knowledgeBaseId, body);
  }

  @Post(':knowledgeBaseId/documents/bulk')
  @Roles('owner', 'admin', 'tutor')
  bulkCreateDocuments(
    @CurrentUser() user: RequestContext,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() body: BulkCreateKnowledgeBaseDocumentsDto,
  ) {
    return this.knowledgeBaseService.bulkCreateDocuments(user, knowledgeBaseId, body);
  }

  @Post('documents/:documentId/ingest')
  @Roles('owner', 'admin', 'tutor')
  ingestDocument(
    @CurrentUser() user: RequestContext,
    @Param('documentId') documentId: string,
    @Body() body: IngestDocumentDto,
  ) {
    return this.knowledgeBaseService.ingestDocument(user, documentId, body);
  }

  @Get(':knowledgeBaseId/documents')
  @Roles('owner', 'admin', 'tutor')
  listDocuments(@CurrentUser() user: RequestContext, @Param('knowledgeBaseId') knowledgeBaseId: string) {
    return this.knowledgeBaseService.listDocuments(user, knowledgeBaseId);
  }

  @Delete('documents/:documentId')
  @Roles('owner', 'admin', 'tutor')
  deleteDocument(@CurrentUser() user: RequestContext, @Param('documentId') documentId: string) {
    return this.knowledgeBaseService.deleteDocument(user, documentId);
  }

  @Patch('documents/:documentId')
  @Roles('owner', 'admin', 'tutor')
  updateDocument(
    @CurrentUser() user: RequestContext,
    @Param('documentId') documentId: string,
    @Body() body: UpdateKnowledgeBaseDocumentDto,
  ) {
    return this.knowledgeBaseService.updateDocument(user, documentId, body);
  }
}
