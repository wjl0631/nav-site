import Link from 'next/link';
import { markdownToPlainText } from '@/lib/markdown-fallback';
import { formatDate, truncate } from '@/lib/utils';
import { SmartImage } from './smart-image';

export type ArticleCardData = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverUrl?: string | null;
  publishedAt?: Date | string | null;
  tags?: string[];
};

export function ArticleCard({ article, priority = false }: { article: ArticleCardData; priority?: boolean }) {
  const summary = article.summary ? truncate(markdownToPlainText(article.summary), 88) : '';

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
        {article.coverUrl ? (
          <SmartImage
            src={article.coverUrl}
            alt={article.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-soft to-surface-2 text-2xl font-semibold text-brand/70">
            {article.title.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink group-hover:text-brand">
          {article.title}
        </h3>
        {summary && <p className="line-clamp-2 text-[12px] leading-relaxed text-muted">{summary}</p>}
        <div className="mt-auto flex items-center gap-1.5 pt-0.5 text-[11px] text-muted">
          <time>{formatDate(article.publishedAt)}</time>
          {article.tags && article.tags.length > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="truncate">{article.tags.slice(0, 2).join(' / ')}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
