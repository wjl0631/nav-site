import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

function createClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Neon / Serverless Postgres 会 scale-to-zero，唤醒期间偶发 P1001（Can't reach database server）。
  // 这里对连接类错误做退避重试，避免把冷启动直接暴露成 500。
  //
  // 为什么是两次而不是一次：实测 Neon 从挂起到可连接常在 1~3 秒之间，
  // 单次 600ms 的重试经常在实例还没唤醒时就已经放弃，表现就是「首屏报错、刷新就好」。
  // 累计等待 1.6 秒仍失败，基本可以判定不是冷启动，直接抛出交给错误边界。
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        const delays = [400, 1200];
        let lastError: unknown;

        for (let attempt = 0; attempt <= delays.length; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            if (!isUnreachable(error)) throw error;
            lastError = error;
            const delay = delays[attempt];
            if (delay === undefined) break;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        throw lastError;
      },
    },
  });
}

function isUnreachable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { errorCode?: string; code?: string })?.errorCode ?? (error as { code?: string })?.code;
  return code === 'P1001' || message.includes('P1001') || message.includes("Can't reach database server");
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
