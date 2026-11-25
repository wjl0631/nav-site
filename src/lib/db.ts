import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

function createClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Neon / Serverless Postgres 会 scale-to-zero，唤醒期间偶发 P1001（Can't reach database server）。
  // 这里对连接类错误做一次短重试，避免把冷启动直接暴露成 500。
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!isUnreachable(error)) throw error;
          await new Promise((resolve) => setTimeout(resolve, 600));
          return query(args);
        }
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
