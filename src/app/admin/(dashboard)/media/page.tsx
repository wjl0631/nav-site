import { prisma } from '@/lib/db';
import { MediaManager, type MediaRow } from '@/components/admin/media-manager';
import type { MediaKind } from '@/lib/upload-client';

export const dynamic = 'force-dynamic';

/**
 * 免费存储额度（GB）。
 * Hobby 计划 Vercel Blob 为 1 GB/月，升级 Pro 后可用 BLOB_QUOTA_GB 改大。
 */
function quotaBytes() {
  const gb = Number(process.env.BLOB_QUOTA_GB);
  return (Number.isFinite(gb) && gb > 0 ? gb : 1) * 1024 ** 3;
}

export default async function AdminMediaPage() {
  // 用量直接汇总 Media 表：不调用 Blob 的 list()，避免把高级操作额度烧在统计上
  const [media, grouped] = await Promise.all([
    prisma.media.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.media.groupBy({ by: ['type'], _sum: { size: true }, _count: { _all: true } }),
  ]);

  const rows: MediaRow[] = media.map((m) => ({
    id: m.id,
    url: m.url,
    type: m.type,
    filename: m.filename,
    mimeType: m.mimeType,
    size: m.size,
    createdAt: m.createdAt,
  }));

  const byType: Array<{ type: MediaKind; size: number; count: number }> = grouped.map((g) => ({
    type: g.type,
    size: g._sum.size ?? 0,
    count: g._count._all,
  }));

  const used = byType.reduce((sum, item) => sum + item.size, 0);
  const count = byType.reduce((sum, item) => sum + item.count, 0);

  return (
    <MediaManager media={rows} usage={{ used, count, quota: quotaBytes(), byType }} />
  );
}
