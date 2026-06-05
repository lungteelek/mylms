"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTranscriptSegments = buildTranscriptSegments;
exports.deriveTranscriptSource = deriveTranscriptSource;
function stripHtml(input) {
    return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildTranscriptSegments(source) {
    const sanitized = source.trim();
    const pieces = sanitized
        .split(/(?<=[.!?])\s+/)
        .map((piece) => piece.trim())
        .filter(Boolean);
    const baseSegments = pieces.length > 0 ? pieces : [sanitized];
    return baseSegments.map((text, index) => {
        const startMs = index * 15000;
        const duration = Math.max(4000, Math.min(20000, text.length * 55));
        return {
            startMs,
            endMs: startMs + duration,
            text,
            segmentIndex: index + 1,
        };
    });
}
function deriveTranscriptSource(input) {
    if (input.overrideText?.trim()) {
        return input.overrideText.trim();
    }
    if (input.plainText?.trim()) {
        return input.plainText.trim();
    }
    if (input.htmlContent?.trim()) {
        return stripHtml(input.htmlContent);
    }
    return `${input.title}. เนื้อหาวิดีโอยังไม่มี transcript จริง จึงใช้ข้อความ placeholder สำหรับทดสอบระบบ transcript และ click to seek.`;
}
