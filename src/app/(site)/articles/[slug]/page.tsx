import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { markdownToPlainText, normalizeArticleHtml } from '@/lib/markdown-fallback';
import { absoluteUrl, decodeParam, formatDate } from '@/lib/utils';
import { SmartImage } from '@/components/site/smart-image';
import { ChevronLeft, ChevronRight, Eye } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

async function getArticle(rawSlug: string) {
  // 中文 slug 在 URL 中是百分号编码，需先解码再查库
  const slug = decodeParam(rawSlug);
  return prisma.article.findFirst({
    where: { slug, status: 'PUBLISHED' },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: '文章不存在' };

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.summary || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: absoluteUrl(`/articles/${article.slug}`),
      publishedTime: article.publishedAt?.toISOString(),
      tags: article.tags,
      images: article.coverUrl ? [{ url: article.coverUrl }] : undefined,
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const summary = markdownToPlainText(article.summary);
  const contentHtml = normalizeArticleHtml(article.contentHtml);

  prisma.article
    .update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  const [prev, next] = await Promise.all([
    prisma.article.findFirst({
      where: { status: 'PUBLISHED', publishedAt: { lt: article.publishedAt ?? new Date() } },
      orderBy: { publishedAt: 'desc' },
      select: { title: true, slug: true },
    }),
    prisma.article.findFirst({
      where: { status: 'PUBLISHED', publishedAt: { gt: article.publishedAt ?? new Date() } },
      orderBy: { publishedAt: 'asc' },
      select: { title: true, slug: true },
    }),
  ]);

  return (
    <article className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/articles"
        className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        返回文章列表
      </Link>

      <header className="mt-3">
        <h1 className="text-[21px] font-semibold leading-tight tracking-tight text-ink sm:text-[28px]">
          {article.title}
        </h1>

        {summary && (
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted sm:text-[13.5px]">{summary}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-muted">
          <time dateTime={article.publishedAt?.toISOString()}>{formatDate(article.publishedAt)}</time>
          <span className="text-border">/</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {article.viewCount + 1}
          </span>
          {article.tags.length > 0 && (
            <>
              <span className="text-border">/</span>
              <span className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/articles?q=${encodeURIComponent(tag)}`}
                    className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-soft transition hover:text-brand"
                  >
                    #{tag}
                  </Link>
                ))}
              </span>
            </>
          )}
        </div>
      </header>

      {article.coverUrl && (
        <div className="relative mt-5 aspect-[16/9] overflow-hidden rounded-xl border border-border bg-surface-2">
          <SmartImage
            src={article.coverUrl}
            alt={article.title}
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      <div
        className="prose-article mt-6"
        // 正文在写入时已通过 sanitize-html 清洗（服务端执行）；早期把 Markdown 原文
        // 存成纯文本的文章，由 normalizeArticleHtml 在渲染时补转成 HTML
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      <nav className="mt-8 grid gap-2.5 border-t border-border pt-5 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/articles/${prev.slug}`}
            className="group rounded-xl border border-border bg-surface p-3 transition hover:border-brand/40"
          >
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <ChevronLeft className="h-3 w-3" />
              上一篇
            </span>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] font-medium text-ink group-hover:text-brand">
              {prev.title}
            </p>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}

        {next && (
          <Link
            href={`/articles/${next.slug}`}
            className="group rounded-xl border border-border bg-surface p-3 text-right transition hover:border-brand/40"
          >
            <span className="flex items-center justify-end gap-1 text-[11px] text-muted">
              下一篇
              <ChevronRight className="h-3 w-3" />
            </span>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] font-medium text-ink group-hover:text-brand">
              {next.title}
            </p>
          </Link>
        )}
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.summary ?? undefined,
            image: article.coverUrl ?? undefined,
            datePublished: article.publishedAt?.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            author: { '@type': 'Organization', name: process.env.NEXT_PUBLIC_SITE_NAME || '浮生若梦' },
            mainEntityOfPage: absoluteUrl(`/articles/${article.slug}`),
          }),
        }}
      />
    </article>
  );
}
