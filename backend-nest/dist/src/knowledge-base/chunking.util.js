"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkText = chunkText;
exports.embeddingToSqlVector = embeddingToSqlVector;
function chunkText(input, maxChars = 900) {
    const normalized = input.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return [];
    }
    const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
    const chunks = [];
    let buffer = '';
    for (const sentence of sentences) {
        const candidate = buffer ? `${buffer} ${sentence}` : sentence;
        if (candidate.length > maxChars && buffer) {
            chunks.push(buffer);
            buffer = sentence;
        }
        else {
            buffer = candidate;
        }
    }
    if (buffer) {
        chunks.push(buffer);
    }
    if (chunks.length === 0) {
        chunks.push(normalized.slice(0, maxChars));
    }
    return chunks;
}
function embeddingToSqlVector(values) {
    return `[${values.join(',')}]`;
}
