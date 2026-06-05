"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocumentText = parseDocumentText;
const fs_1 = require("fs");
function stripHtml(input) {
    return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function parseDocumentText(input) {
    const inlineText = input.fileText?.trim();
    if (inlineText) {
        return input.sourceType === 'html' ? stripHtml(inlineText) : inlineText;
    }
    if (input.localFilePath?.trim()) {
        const raw = (0, fs_1.readFileSync)(input.localFilePath, 'utf-8');
        return input.sourceType === 'html' ? stripHtml(raw) : raw.replace(/\s+/g, ' ').trim();
    }
    return '';
}
