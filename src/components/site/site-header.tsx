'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/ui/brand-mark';
import { FileText, Home, Search, X } from '@/components/ui/icons';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSearchQuery } from './search-context';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || '浮生若梦';

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

function SearchField({ value, onChange, onSubmit, placeholder, inputRef }: SearchFieldProps) {
  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-[13px] text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-ring"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="清空搜索"
          className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}

/**
 * 顶栏搜索：首页与文章列表共用同一个输入框。
 * - 首页：直接过滤已加载的链接（客户端，零请求）
 * - 文章列表：输入后防抖写入 ?q=，走服务端检索与分页
 */
function HeaderSearch({ inputRef }: { inputRef?: React.RefObject<HTMLInputElement | null> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { query: homeQuery, setQuery: setHomeQuery } = useSearchQuery();

  const isHome = pathname === '/';
  // 非首页（文章列表、文章详情）统一按「文章检索」处理：写入 /articles?q=
  const isArticles = !isHome;

  const [text, setText] = React.useState(() => searchParams.get('q') ?? '');

  // 文章页：URL 参数变化（前进 / 后退 / 点分页）时同步输入框
  React.useEffect(() => {
    if (isArticles) setText(searchParams.get('q') ?? '');
  }, [isArticles, searchParams]);

  const pushArticles = React.useCallback(
    (value: string) => {
      const q = value.trim();
      router.replace(q ? `/articles?q=${encodeURIComponent(q)}` : '/articles', { scroll: false });
    },
    [router],
  );

  // 文章页输入防抖写入 URL，避免每次按键都打一次服务端
  React.useEffect(() => {
    if (!isArticles) return;
    const current = searchParams.get('q') ?? '';
    if (text.trim() === current.trim()) return;
    const timer = setTimeout(() => pushArticles(text), 350);
    return () => clearTimeout(timer);
  }, [text, isArticles, searchParams, pushArticles]);

  const value = isHome ? homeQuery : text;
  const change = (next: string) => {
    if (isHome) setHomeQuery(next);
    else setText(next);
  };

  return (
    <SearchField
      value={value}
      onChange={change}
      onSubmit={() => {
        if (isArticles) pushArticles(text);
      }}
      placeholder={isHome ? '搜索站点、分类或关键词…' : '搜索文章标题、摘要或标签'}
      inputRef={inputRef}
    />
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);

  const isHome = pathname === '/';
  const onArticles = pathname.startsWith('/articles');

  React.useEffect(() => setSearchOpen(false), [pathname]);
  React.useEffect(() => {
    if (searchOpen) mobileInputRef.current?.focus();
  }, [searchOpen]);

  const navItem = (active: boolean) =>
    cn(
      'flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition md:px-2.5',
      active ? 'bg-surface-2 font-medium text-ink' : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
    );

  const fallback = <div className="h-9 w-full rounded-lg bg-surface-2/50" />;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-12 items-center gap-2 sm:grid sm:h-14 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)_minmax(0,1fr)] sm:items-center sm:gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)_minmax(0,1fr)]">
          <Link href="/" className="group flex shrink-0 items-center gap-2 sm:justify-self-start">
            <BrandMark className="h-[22px] w-[22px] sm:h-6 sm:w-6" />
            <span className="translate-y-0.5 font-serif text-[16px] tracking-[0.12em] text-ink sm:text-[17px]">
              {SITE_NAME}
            </span>
          </Link>

          {/* 桌面端：搜索居中，两侧各占 1fr，避免宽屏右侧出现大片空白 */}
          <div className="hidden w-full sm:block">
            <React.Suspense fallback={fallback}>
              <HeaderSearch />
            </React.Suspense>
          </div>

          <nav className="ml-auto flex items-center gap-0.5 text-[13px] md:ml-0 md:justify-self-end">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={searchOpen ? '收起搜索' : '展开搜索'}
              aria-expanded={searchOpen}
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition sm:hidden',
                searchOpen ? 'bg-surface-2 text-ink' : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
              )}
            >
              <Search className="h-4 w-4" />
            </button>
            <Link href="/" className={navItem(isHome)} aria-current={isHome ? 'page' : undefined}>
              <Home className="h-3.5 w-3.5" />
              <span className="hidden md:inline">首页</span>
            </Link>
            <Link href="/articles" className={navItem(onArticles)} aria-current={onArticles ? 'page' : undefined}>
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden md:inline">文章</span>
            </Link>
            <ThemeToggle className="ml-0.5" />
          </nav>
        </div>

        {/* 移动端：搜索展开为导航栏下方一行 */}
        {searchOpen && (
          <div className="pb-2 sm:hidden">
            <React.Suspense fallback={fallback}>
              <HeaderSearch inputRef={mobileInputRef} />
            </React.Suspense>
          </div>
        )}
      </div>
    </header>
  );
}
