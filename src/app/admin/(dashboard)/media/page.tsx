import { prisma } from '@/lib/db';
import { MediaManager, type MediaRow } from '@/components/admin/media-manager';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const media = await prisma.media.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });

  const rows: MediaRow[] = media.map((m) => ({
    id: m.id,
    url: m.url,
    type: m.type,
    filename: m.filename,
    mimeType: m.mimeType,
    size: m.size,
    createdAt: m.createdAt,
  }));

  return <MediaManager media={rows} />;
}
