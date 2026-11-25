'use client';

import * as React from 'react';
import { Moon, Sun } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/**
 * 深浅色切换。图标由 CSS 按 html.dark 决定显示哪个，
 * 因此首屏不依赖 React 状态，不会出现图标闪动或水合不一致。
 */
type ThemeApply = (dark: boolean) => void;

export function ThemeToggle({ className }: { className?: string }) {
  const toggle = React.useCallback(() => {
    const root = document.documentElement;
    const next = !root.classList.contains('dark');
    // 复用 layout 内联脚本定义的 apply（顺带同步 theme-color）
    const apply = (window as unknown as { __navApplyTheme?: ThemeApply }).__navApplyTheme;
    if (apply) {
      apply(next);
    } else {
      root.classList.add('theme-switching');
      root.classList.toggle('dark', next);
      root.style.colorScheme = next ? 'dark' : 'light';
      requestAnimationFrame(() =>
        requestAnimationFrame(() => root.classList.remove('theme-switching')),
      );
    }
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* 隐私模式下 localStorage 可能不可写，忽略即可 */
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切换深色 / 浅色模式"
      title="切换深色 / 浅色模式"
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-surface-2 hover:text-ink',
        className,
      )}
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
