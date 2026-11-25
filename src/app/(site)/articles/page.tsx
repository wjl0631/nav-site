import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ArticleCard } from '@/components/site/article-card';
import { Pagination } from '@/components/site/pagination';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 9;

export const metadata: Metadata = {
  title: '文章',
  description: '深度文章与实用指南，按时间归档，支持关键词检索。',
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q: rawQ, page: rawPage } = await searchParams;
  const q = (rawQ ?? '').trim();
  const page = Math.max(1, Number(rawPage) || 1);

  const where = {
    status: 'PUBLISHED' as const,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { summary: { contains: q, mode: 'insensitive' as const } },
            { tags: { has: q } },
          ],
        }
      : {}),
  };

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, slug: true, summary: true, coverUrl: true, publishedAt: true, tags: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/articles?${qs}` : '/articles';
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight text-ink sm:text-[22px]">文章</h1>
        <p className="mt-0.5 text-[12px] text-muted sm:text-[13px]">
          {q ? `“${q}” 的搜索结果 · ${total} 篇` : `共 ${total} 篇已发布内容`}
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">{q ? '没有找到匹配的文章' : '还没有发布任何文章'}</p>
          <p className="mt-1 text-xs text-muted">
            {q ? '换个关键词试试，或浏览全部文章。' : '在后台「文章管理」中创建并发布第一篇内容。'}
          </p>
          <Link
            href="/articles"
            className="mt-5 inline-flex rounded-xl border border-border bg-surface px-4 py-2 text-xs text-ink-soft transition hover:bg-surface-2"
          >
            查看全部文章
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <ArticleCard key={article.id} article={article} priority={i < 3} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
