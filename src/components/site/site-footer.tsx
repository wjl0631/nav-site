import Link from 'next/link';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || '浮生若梦';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    // 钉在视口底部：高度固定 3rem（+ 移动端安全区），页面内容用 pb 让位，见 (site)/layout.tsx
    <footer className="fixed inset-x-0 bottom-0 z-20 h-[calc(3rem+env(safe-area-inset-bottom))] border-t border-border bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-4 text-[11px] text-muted sm:px-6">
        <p className="shrink-0">© {year} {SITE_NAME}</p>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <Link href="/admin" className="transition hover:text-ink">
            后台管理
          </Link>
          <a href="#top" className="transition hover:text-ink">
            回到顶部
          </a>
        </div>
      </div>
    </footer>
  );
}
