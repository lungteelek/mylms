import crypto from 'crypto';
import path from 'path';

export function decodeMultipartFilename(value?: string | null) {
  const raw = String(value || '');
  if (!raw) return '';

  // Multer often exposes multipart filenames as latin1-decoded UTF-8 bytes.
  // Re-decode them when it looks like the filename came through mojibake.
  const decoded = Buffer.from(raw, 'latin1').toString('utf8');
  if (decoded === raw || decoded.includes('\uFFFD')) {
    return raw;
  }

  const rawHasThai = /[\u0E00-\u0E7F]/.test(raw);
  const decodedHasThai = /[\u0E00-\u0E7F]/.test(decoded);
  return decodedHasThai && !rawHasThai ? decoded : raw;
}

function sanitizeUploadStem(value: string, fallback: string) {
  const stem = String(value || '')
    .normalize('NFKC')
    .replace(/[\/\\\0]/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const trimmed = stem.slice(0, 48);
  return trimmed || fallback;
}

export function buildCompactUploadFileName(originalName?: string | null, fallbackStem = 'asset') {
  const decoded = decodeMultipartFilename(originalName || '');
  const rawExt = path.extname(decoded || '');
  const ext = rawExt.toLowerCase();
  const rawStem = path.basename(decoded || '', rawExt);
  const safeStem = sanitizeUploadStem(rawStem, fallbackStem);
  const suffix = crypto.randomBytes(6).toString('hex');
  return `${safeStem}-${suffix}${ext}`;
}
