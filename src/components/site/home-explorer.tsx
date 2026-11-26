'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CategoryGlyph } from '@/components/ui/category-glyph';
import { LinkCard, type LinkCardData } from './link-card';
import { HomeWelcome } from './home-welcome';
import { useSearchQuery } from './search-context';

export type ExplorerCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  links: LinkCardData[];
};

type Row = LinkCardData & { categoryName: string; categorySlug: string };

export function HomeExplorer({
  categories,
  hasArticles = false,
}: {
  categories: ExplorerCategory[];
  hasArticles?: boolean;
}) {
  // 关键词来自顶栏搜索框
  const { query, setQuery } = useSearchQuery();
  const trimmed = query.trim().toLowerCase();

  const rows = React.useMemo<Row[]>(
    () =>
      categories.flatMap((c) =>
        c.links.map((l) => ({ ...l, categoryName: c.name, categorySlug: c.slug })),
      ),
    [categories],
  );

  const results = React.useMemo(() => {
    if (!trimmed) return [];
    return rows.filter((r) =>
      [r.title, r.description ?? '', r.url, r.categoryName]
        .join(' ')
        .toLowerCase()
        .includes(trimmed),
    );
  }, [rows, trimmed]);

  // 搜索优先：一个站点都没有时，也要给出「没有匹配」的反馈
  if (trimmed) {
    return (
      <section className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-ink sm:text-[15px]">
            搜索结果
            <span className="ml-1.5 text-xs font-normal text-muted">“{query.trim()}”</span>
          </h2>
          <span className="text-xs text-muted">{results.length} 条</span>
        </div>
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink">没有匹配的站点</p>
            <p className="mt-1 text-xs text-muted">试试更短的关键词，或清空搜索浏览全部分类。</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-4 rounded-xl border border-border bg-surface px-4 py-2 text-xs text-ink-soft transition hover:bg-surface-2"
            >
              清空搜索
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r) => (
              <LinkCard key={r.id} link={r} />
            ))}
          </div>
        )}
      </section>
    );
  }

  // 没有任何站点：有文章时不占位（让「最新文章」独占首页），全空时才给整页欢迎页
  if (rows.length === 0) {
    return hasArticles ? null : <HomeWelcome />;
  }

  return (
    <>
      <h1 className="sr-only">精选优质网站与深度文章，一页直达</h1>

      {/* 分类快捷跳转 */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#cat-${c.slug}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-ink-soft transition hover:border-brand/40 hover:text-brand"
            >
              {c.icon ? (
                <CategoryGlyph icon={c.icon} name={c.name} imgClassName="h-3.5 w-3.5 object-contain" />
              ) : null}
              {c.name}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
        <div className="space-y-7 sm:space-y-8">
          {categories.map((category) => (
            <section key={category.id} id={`cat-${category.slug}`} className="scroll-mt-20">
              <div className="mb-2.5 flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface text-[15px] shadow-sm">
                  <CategoryGlyph
                    icon={category.icon}
                    name={category.name}
                    imgClassName="h-full w-full object-contain p-[3px]"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-[14px] font-semibold text-ink sm:text-[15px]">{category.name}</h2>
                    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">
                      {category.links.length}
                    </span>
                  </div>
                  {category.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">{category.description}</p>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  'grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                  category.links.length === 0 && 'hidden',
                )}
              >
                {category.links.map((link) => (
                  <LinkCard key={link.id} link={link} />
                ))}
              </div>
              {category.links.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                  该分类下暂无链接
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
