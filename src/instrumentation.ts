import type { Instrumentation } from 'next';

/**
 * 服务端异常留痕。
 *
 * 线上只能看到一个错误编号（digest），而这个编号是哈希，无法反推内容；
 * Vercel 的 Runtime Logs 又会滚动过期。所以这里把异常落进 runtime_errors 表，
 * 之后用 `prisma.runtimeError.findMany()` 就能看到完整 message 与 stack。
 *
 * 三条硬约束：
 * 1. 只在 Node 运行时执行（Edge 里没有 Prisma）；
 * 2. 写入失败一律吞掉——异常上报本身不能变成新的异常；
 * 3. 超过 2 秒就放弃，避免把请求拖到超时（数据库故障时最典型）。
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { prisma } = await import('@/lib/db');
    const error = err as { digest?: string; message?: string; stack?: string };

    const write = prisma.runtimeError.create({
      data: {
        digest: error?.digest ?? null,
        path: typeof request?.path === 'string' ? request.path.slice(0, 500) : null,
        method: typeof request?.method === 'string' ? request.method : null,
        routePath: context?.routePath ? String(context.routePath).slice(0, 300) : null,
        message: (error?.message ?? String(err)).slice(0, 2000),
        stack: (error?.stack ?? '').slice(0, 6000) || null,
      },
    });

    await Promise.race([
      write,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
  } catch {
    // 上报失败不影响请求，静默丢弃
  }
};
