import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ArticleTable } from '@/components/admin/article-table';
import { Plus } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage() {
  const articles = await prisma.article.findMany({
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isFeatured: true,
      viewCount: true,
      tags: true,
      updatedAt: true,
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">文章管理</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">
            共 {articles.length} 篇 · 已发布 {articles.filter((a) => a.status === 'PUBLISHED').length} 篇
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          写文章
        </Link>
      </div>

      <ArticleTable articles={articles} />
    </div>
  );
}
