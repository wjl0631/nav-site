import Link from 'next/link';

export default function SiteNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <span className="text-4xl font-bold text-border">404</span>
      <h1 className="mt-3 text-lg font-semibold text-ink">内容不存在或尚未发布</h1>
      <p className="mt-2 text-sm text-muted">你访问的页面可能已被删除，或者链接有误。</p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-ink">
          返回首页
        </Link>
        <Link href="/articles" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-ink-soft">
          浏览文章
        </Link>
      </div>
    </div>
  );
}
