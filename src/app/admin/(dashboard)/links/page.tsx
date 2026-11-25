import { prisma } from '@/lib/db';
import { LinkManager, type LinkRow } from '@/components/admin/link-manager';

export const dynamic = 'force-dynamic';

export default async function AdminLinksPage() {
  const [links, categories] = await Promise.all([
    prisma.link.findMany({
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { category: { select: { name: true } } },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);

  const rows: LinkRow[] = links.map((l) => ({
    id: l.id,
    categoryId: l.categoryId,
    title: l.title,
    url: l.url,
    description: l.description,
    iconUrl: l.iconUrl,
    sortOrder: l.sortOrder,
    isVisible: l.isVisible,
    isFeatured: l.isFeatured,
    clickCount: l.clickCount,
    categoryName: l.category.name,
  }));

  return <LinkManager links={rows} categories={categories} />;
}
