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
exports.MediaJobRunnerService = void 0;
const common_1 = require("@nestjs/common");
const openai_provider_1 = require("../ai/openai.provider");
const media_repository_1 = require("./media.repository");
const transcript_util_1 = require("./transcript.util");
let MediaJobRunnerService = class MediaJobRunnerService {
    constructor(mediaRepository, openAiProvider) {
        this.mediaRepository = mediaRepository;
        this.openAiProvider = openAiProvider;
    }
    async runTranscriptPipeline(input) {
        const video = await this.mediaRepository.getVideoAsset(input.tenantId, input.videoAssetId);
        const openAiTranscriptText = input.audioFilePath
            ? await this.openAiProvider.transcribeAudioFile(input.audioFilePath, input.language)
            : null;
        const source = (0, transcript_util_1.deriveTranscriptSource)({
            title: video.title,
            plainText: video.plainText,
            htmlContent: video.htmlContent,
            overrideText: openAiTranscriptText || input.sourceText,
        });
        const segments = (0, transcript_util_1.buildTranscriptSegments)(source);
        const transcriptId = await this.mediaRepository.replaceTranscript(input.videoAssetId, input.language || 'th', source, segments);
        return {
            transcriptId,
            videoAssetId: input.videoAssetId,
            language: input.language || 'th',
            segmentsCount: segments.length,
            status: 'ready',
        };
    }
};
exports.MediaJobRunnerService = MediaJobRunnerService;
exports.MediaJobRunnerService = MediaJobRunnerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [media_repository_1.MediaRepository,
        openai_provider_1.OpenAiProvider])
], MediaJobRunnerService);
