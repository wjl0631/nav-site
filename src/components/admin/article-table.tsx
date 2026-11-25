'use client';

import Link from 'next/link';
import { deleteArticleAction, updateArticleFlagsAction } from '@/actions/article';
import { cn, formatDateTime } from '@/lib/utils';
import { Badge } from './badge';
import { AsyncButton } from './async-button';
import { External, Eye, EyeOff, Pencil, Star, Trash } from '@/components/ui/icons';

export type AdminArticleRow = {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  isFeatured: boolean;
  viewCount: number;
  tags: string[];
  updatedAt: Date;
};

export function ArticleTable({ articles }: { articles: AdminArticleRow[] }) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
        <p className="text-sm font-medium text-ink">还没有文章</p>
        <p className="mt-1 text-xs text-muted">点击右上角「写文章」开始创作，支持图片、视频与音频。</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
      <ul className="divide-y divide-border">
        {articles.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3.5 py-2.5 transition hover:bg-surface-2/40"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/admin/articles/${a.id}/edit`}
                  className="truncate text-[13px] font-medium text-ink transition hover:text-brand"
                >
                  {a.title}
                </Link>
                <Badge tone={a.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                  {a.status === 'PUBLISHED' ? '已发布' : '草稿'}
                </Badge>
                {a.isFeatured && <Badge tone="brand">精选</Badge>}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                <span className="font-mono">/{a.slug}</span>
                <span className="text-border">·</span>
                <span>{formatDateTime(a.updatedAt)}</span>
                <span className="text-border">·</span>
                <span>{a.viewCount} 次阅读</span>
                {a.tags.length > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate">#{a.tags.join(' #')}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex w-full items-center justify-end gap-0.5 whitespace-nowrap sm:w-auto sm:justify-start">
              {a.status === 'PUBLISHED' && (
                <Link
                  href={`/articles/${a.slug}`}
                  target="_blank"
                  aria-label="预览"
                  title="预览"
                  className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
                >
                  <External className="h-4 w-4" />
                </Link>
              )}
              <AsyncButton
                action={() =>
                  updateArticleFlagsAction(a.id, {
                    status: a.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                  })
                }
                className={cn(
                  'rounded-lg p-2 transition hover:bg-surface-2',
                  a.status === 'PUBLISHED' ? 'text-emerald-600' : 'text-muted hover:text-ink',
                )}
                title={a.status === 'PUBLISHED' ? '已发布，点击下架' : '草稿，点击发布'}
                ariaLabel="切换发布状态"
              >
                {a.status === 'PUBLISHED' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </AsyncButton>
              <AsyncButton
                action={() => updateArticleFlagsAction(a.id, { isFeatured: !a.isFeatured })}
                className={cn(
                  'rounded-lg p-2 transition hover:bg-surface-2',
                  a.isFeatured ? 'text-amber-500' : 'text-muted hover:text-ink',
                )}
                title={a.isFeatured ? '取消精选' : '设为精选'}
                ariaLabel="切换精选"
              >
                <Star className="h-4 w-4" filled={a.isFeatured} />
              </AsyncButton>
              <Link
                href={`/admin/articles/${a.id}/edit`}
                aria-label="编辑"
                title="编辑"
                className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <AsyncButton
                action={() => deleteArticleAction(a.id)}
                confirm={`确定删除文章「${a.title}」？此操作不可恢复。`}
                className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                title="删除"
                ariaLabel="删除"
              >
                <Trash className="h-4 w-4" />
              </AsyncButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
