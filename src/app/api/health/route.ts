import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 线上自检：/api/health
 *
 * 只做两件事——能不能连上库、业务表在不在。
 * 不返回任何凭据，只返回主机名（用于和本地 .env 比对是不是同一个 Neon 项目）。
 * 上线排障完可以删掉这个文件。
 */

function hostOf(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return '解析失败';
  }
}

function describe(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      kind: 'init',
      code: error.errorCode ?? null,
      message: error.message.split('\n')[0].slice(0, 300),
      hint: '连接串本身有问题：检查 DATABASE_URL 是否完整、是否带 sslmode=require、密码是否含未转义字符。',
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const hints: Record<string, string> = {
      P1001: '连不上数据库主机：Neon 项目可能被暂停，或连接串指向了不可达的地址。',
      P2021: '这个库里没有对应的表：线上库尚未执行 prisma db push，或指向了另一个空库。',
      P2022: '表结构少列：线上库的 schema 落后于代码，需要重新 db push。',
      P1017: '连接被服务端关闭：Neon 冷启动超时，重试一次通常可恢复。',
      P1000: '认证失败：数据库用户名或密码不正确。',
    };
    return {
      kind: 'prisma',
      code: error.code,
      message: error.message.split('\n').slice(0, 4).join(' | ').slice(0, 400),
      hint: hints[error.code] ?? '请对照 Prisma 错误码文档排查。',
    };
  }
  const err = error as { message?: string; name?: string };
  return {
    kind: 'unknown',
    code: null,
    message: (err?.message ?? String(error)).slice(0, 400),
    hint: '非 Prisma 标准错误，查看 Vercel Functions 日志获取完整堆栈。',
  };
}

export async function GET() {
  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
    BLOB_READ_WRITE_TOKEN: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    dbHost: hostOf(process.env.DATABASE_URL),
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, stage: 'env', env, error: { hint: 'DATABASE_URL 未注入到运行时。' } },
      { status: 500 },
    );
  }

  try {
    await prisma.$queryRawUnsafe('select 1');
  } catch (error) {
    return NextResponse.json({ ok: false, stage: 'connect', env, error: describe(error) }, { status: 500 });
  }

  try {
    const [categories, links, articles, media, loginLogs] = await Promise.all([
      prisma.category.count(),
      prisma.link.count(),
      prisma.article.count(),
      prisma.media.count(),
      prisma.loginLog.count(),
    ]);

    return NextResponse.json({
      ok: true,
      stage: 'query',
      env,
      counts: { categories, links, articles, media, loginLogs },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, stage: 'schema', env, error: describe(error) }, { status: 500 });
  }
}
