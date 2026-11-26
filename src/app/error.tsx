'use client';

import { useEffect } from 'react';

/**
 * 站点级错误边界。
 *
 * 注意：这里拿到的是**任意**路由异常，无法区分是连接串错了、表不存在还是代码抛错，
 * 所以文案不能写具体的排查步骤（原来的「检查 DATABASE_URL / 执行 db:push」
 * 会误导访客，也对不上真实原因）。这里只给通用提示 + 错误编号，
 * 编号对应 Vercel Functions 日志里的 digest，用于事后定位。
 */
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
        服务端开了个小差，稍后重试通常就能恢复。如果反复出现，请把下面的错误编号发给站点管理员。
      </p>

      {error.digest && (
        <p className="mt-4 font-mono text-[11px] tracking-wide text-muted/70">错误编号 {error.digest}</p>
      )}

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
