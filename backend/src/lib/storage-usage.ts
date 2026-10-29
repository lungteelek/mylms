import fs from 'fs';
import path from 'path';

function sumFileSizes(targetPath: string): number {
  if (!fs.existsSync(targetPath)) return 0;
  const stats = fs.statSync(targetPath);
  if (stats.isFile()) return stats.size;
  if (!stats.isDirectory()) return 0;

  return fs.readdirSync(targetPath).reduce((total, entry) => {
    return total + sumFileSizes(path.join(targetPath, entry));
  }, 0);
}

export function getTenantVideoStorageUsage(tenantId: number, tenantSlug: string) {
  const roots = [
    path.join(process.cwd(), 'uploads', 'media', String(tenantId)),
    path.join(process.cwd(), 'uploads', 'media', tenantSlug),
    path.join(process.cwd(), 'uploads', 'media-sources', `tenant-${tenantId}`),
  ];

  const bytesUsed = roots.reduce((total, targetPath) => total + sumFileSizes(targetPath), 0);

  return {
    bytesUsed,
    gigabytesUsed: Number((bytesUsed / (1024 ** 3)).toFixed(3)),
  };
}
