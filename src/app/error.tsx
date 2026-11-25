'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-xl">⚠️</span>
      <h1 className="mt-4 text-lg font-semibold text-ink">页面暂时无法加载</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        可能是数据库连接未配置或临时故障。请检查环境变量 <code className="rounded bg-surface-2 px-1">DATABASE_URL</code>{' '}
        并确认已执行 <code className="rounded bg-surface-2 px-1">npm run db:push</code>。
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-ink"
        >
          重试
        </button>
        <a href="/" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-ink-soft">
          返回首页
        </a>
      </div>
    </div>
  );
}
