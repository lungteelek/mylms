"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('ai', () => ({
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    openAiResponsesModel: process.env.OPENAI_RESPONSES_MODEL || 'gpt-4.1-mini',
    openAiTranscriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
}));
