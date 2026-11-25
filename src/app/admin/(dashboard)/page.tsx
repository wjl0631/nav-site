import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/admin/badge';
import { FileText, Folder, LinkIcon, Plus, Eye } from '@/components/ui/icons';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  const [categoryCount, linkCount, articleCount, publishedCount, clickSum, recentArticles, recentLinks] =
    await Promise.all([
      prisma.category.count(),
      prisma.link.count(),
      prisma.article.count(),
      prisma.article.count({ where: { status: 'PUBLISHED' } }),
      prisma.link.aggregate({ _sum: { clickCount: true } }),
      prisma.article.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, slug: true, status: true, updatedAt: true },
      }),
      prisma.link.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, url: true, clickCount: true, createdAt: true },
      }),
    ]);

  const stats = [
    { label: '分类', value: categoryCount, href: '/admin/categories', icon: Folder },
    { label: '链接', value: linkCount, href: '/admin/links', icon: LinkIcon },
    { label: '文章', value: articleCount, sub: `已发布 ${publishedCount}`, href: '/admin/articles', icon: FileText },
    { label: '总点击', value: clickSum._sum.clickCount ?? 0, href: '/admin/links', icon: Eye },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">概览</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">站点内容与近期动态</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/articles/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            写文章
          </Link>
          <Link
            href="/admin/links"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 text-[13px] text-ink-soft transition hover:bg-surface-2"
          >
            <LinkIcon className="h-4 w-4" />
            加链接
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-xl border border-border bg-surface p-3.5 shadow-[var(--shadow-card)] transition hover:border-brand/40"
            >
              <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <p className="mt-1.5 text-xl font-semibold tabular-nums text-ink">{s.value}</p>
              {s.sub && <p className="mt-0.5 text-[11px] text-muted">{s.sub}</p>}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <h3 className="text-[13px] font-semibold text-ink">最近编辑的文章</h3>
            <Link href="/admin/articles" className="text-xs text-brand hover:underline">
              全部
            </Link>
          </div>
          {recentArticles.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-xs text-muted">还没有文章</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentArticles.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/articles/${a.id}/edit`}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-ink">{a.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted">{formatDateTime(a.updatedAt)}</span>
                    </span>
                    <Badge tone={a.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                      {a.status === 'PUBLISHED' ? '已发布' : '草稿'}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
            <h3 className="text-[13px] font-semibold text-ink">最新添加的链接</h3>
            <Link href="/admin/links" className="text-xs text-brand hover:underline">
              全部
            </Link>
          </div>
          {recentLinks.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-xs text-muted">还没有链接</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentLinks.map((l) => (
                <li key={l.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">{l.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted">{l.url}</span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted">{l.clickCount} 次</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
