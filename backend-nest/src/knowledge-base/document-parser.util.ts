import { readFileSync } from 'fs';

function stripHtml(input: string) {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseDocumentText(input: {
  sourceType: string;
  fileText?: string | null;
  localFilePath?: string | null;
}) {
  const inlineText = input.fileText?.trim();
  if (inlineText) {
    return input.sourceType === 'html' ? stripHtml(inlineText) : inlineText;
  }

  if (input.localFilePath?.trim()) {
    const raw = readFileSync(input.localFilePath, 'utf-8');
    return input.sourceType === 'html' ? stripHtml(raw) : raw.replace(/\s+/g, ' ').trim();
  }

  return '';
}
