import { Injectable } from '@nestjs/common';
import { OpenAiProvider } from '../ai/openai.provider';
import { MediaRepository } from './media.repository';
import { buildTranscriptSegments, deriveTranscriptSource } from './transcript.util';

@Injectable()
export class MediaJobRunnerService {
  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly openAiProvider: OpenAiProvider,
  ) {}

  async runTranscriptPipeline(input: {
    tenantId: string;
    videoAssetId: string;
    language?: string;
    sourceText?: string;
    audioFilePath?: string;
  }) {
    const video = await this.mediaRepository.getVideoAsset(input.tenantId, input.videoAssetId);
    const openAiTranscriptText = input.audioFilePath
      ? await this.openAiProvider.transcribeAudioFile(input.audioFilePath, input.language)
      : null;
    const source = deriveTranscriptSource({
      title: video.title,
      plainText: video.plainText,
      htmlContent: video.htmlContent,
      overrideText: openAiTranscriptText || input.sourceText,
    });
    const segments = buildTranscriptSegments(source);
    const transcriptId = await this.mediaRepository.replaceTranscript(
      input.videoAssetId,
      input.language || 'th',
      source,
      segments,
    );

    return {
      transcriptId,
      videoAssetId: input.videoAssetId,
      language: input.language || 'th',
      segmentsCount: segments.length,
      status: 'ready',
    };
  }
}
