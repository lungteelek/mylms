import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  openAiResponsesModel: process.env.OPENAI_RESPONSES_MODEL || 'gpt-4.1-mini',
  openAiTranscriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
}));
