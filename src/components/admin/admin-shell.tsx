'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/ui/brand-mark';
import { logoutAction } from '@/actions/auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  External,
  FileText,
  Folder,
  Grid,
  ImageIcon,
  LinkIcon,
  LogOut,
  Menu,
  Settings,
  X,
} from '@/components/ui/icons';

const NAV = [
  { href: '/admin', label: '概览', icon: Grid, exact: true },
  { href: '/admin/categories', label: '分类管理', icon: Folder },
  { href: '/admin/links', label: '链接管理', icon: LinkIcon },
  { href: '/admin/articles', label: '文章管理', icon: FileText },
  { href: '/admin/media', label: '媒体中心', icon: ImageIcon },
  { href: '/admin/settings', label: '账号设置', icon: Settings },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const current = NAV.filter((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href))).pop();

  const navList = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-0.5 px-2.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition',
              active
                ? 'bg-brand-soft font-medium text-brand'
                : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href="/" className="group flex items-center gap-2 px-4 py-3" target="_blank">
      <BrandMark className="h-6 w-6" />
      <span className="translate-y-0.5 font-serif text-[17px] tracking-[0.1em] text-ink">黄粱一梦</span>
      <External className="h-3.5 w-3.5 text-muted" />
    </Link>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      {/* 桌面侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border bg-surface lg:flex">
        {brand}
        <div className="flex-1 overflow-y-auto py-1.5">{navList()}</div>
        <div className="border-t border-border p-2.5">
          <div className="rounded-lg bg-surface-2 px-2.5 py-2">
            <p className="truncate text-[12.5px] font-medium text-ink">{user.name || '管理员'}</p>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
          </div>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-soft transition hover:bg-surface-2 hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </form>
        </div>
      </aside>

      {/* 移动端抽屉 */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative flex h-full w-[78%] max-w-[280px] flex-col bg-surface shadow-2xl animate-[sheetUp_.2s_ease]">
            <div className="flex items-center justify-between pr-2">
              {brand}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭菜单"
                className="rounded-lg p-2 text-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">{navList(() => setOpen(false))}</div>
            <form action={logoutAction} className="border-t border-border p-3">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-soft hover:bg-surface-2 hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 内容区 */}
      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2.5 border-b border-border bg-canvas/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="打开菜单"
            className="-ml-2 rounded-lg p-2 text-ink-soft hover:bg-surface-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="hidden text-muted sm:inline">后台</span>
            <span className="hidden text-border sm:inline">/</span>
            <span className="truncate font-medium text-ink">{current?.label ?? '概览'}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle className="h-7 w-7" />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">{children}</main>
      </div>
    </div>
  );
}
