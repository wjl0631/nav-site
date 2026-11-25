import Link from 'next/link';
import { prisma } from '@/lib/db';
import { HomeExplorer, type ExplorerCategory } from '@/components/site/home-explorer';
import { ArticleCard } from '@/components/site/article-card';
import { ChevronRight } from '@/components/ui/icons';

// 数据实时性优先；如需 ISR 可改为：export const revalidate = 300;
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [categories, articles] = await Promise.all([
    prisma.category.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        links: {
          where: { isVisible: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    }),
    prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: 3,
      select: { id: true, title: true, slug: true, summary: true, coverUrl: true, publishedAt: true, tags: true },
    }),
  ]);

  const explorerCategories: ExplorerCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    description: c.description,
    links: c.links.map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      description: l.description,
      iconUrl: l.iconUrl,
      isFeatured: l.isFeatured,
    })),
  }));

  const hasLinks = explorerCategories.some((c) => c.links.length > 0);
  const hasArticles = articles.length > 0;

  return (
    <>
      <HomeExplorer categories={explorerCategories} hasArticles={hasArticles} />

      {hasArticles && (
        <section
          className={
            hasLinks
              ? 'mx-auto mt-8 max-w-6xl px-4 sm:mt-10 sm:px-6'
              : 'mx-auto mt-6 max-w-6xl px-4 sm:mt-7 sm:px-6'
          }
        >
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-ink sm:text-[16px]">最新文章</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">工具之外，也读点有厚度的内容</p>
            </div>
            <Link
              href="/articles"
              className="flex shrink-0 items-center gap-0.5 text-xs text-brand transition hover:gap-1.5"
            >
              全部文章
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
