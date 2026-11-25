import { prisma } from '@/lib/db';
import { CategoryManager, type CategoryRow } from '@/components/admin/category-manager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { links: true } } },
  });

  const rows: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    description: c.description,
    sortOrder: c.sortOrder,
    isVisible: c.isVisible,
    linkCount: c._count.links,
  }));

  return <CategoryManager categories={rows} />;
}
