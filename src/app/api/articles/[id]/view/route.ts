import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** 已读文章 id 的 Cookie 名（6 小时内同一篇不重复计数） */
const SEEN_COOKIE = 'nv_seen';
const SEEN_MAX_AGE = 60 * 60 * 6;
/** Cookie 内最多保留的 id 数量，避免无限增长 */
const SEEN_LIMIT = 20;

/**
 * 爬虫 / 抓取器 / 链接预览 / 监控探针的 UA 特征。
 * 这类请求不产生真实阅读，命中即跳过计数。
 */
const BOT_UA = /(bot|crawler|spider|crawling|slurp|baiduspider|yandex|sogou|exabot|ia_archiver|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|twitterbot|linkedinbot|embedly|pinterest|w3c_validator|headlesschrome|lighthouse|pingdom|uptime|monitor|preview|curl|wget|python-requests|axios|node-fetch|go-http-client|java\/)/i;

function seenIds(raw: string | undefined) {
  return new Set((raw ?? '').split('.').filter(Boolean));
}

/** POST /api/articles/[id]/view —— 由客户端上报一次阅读 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const userAgent = request.headers.get('user-agent') ?? '';
  if (!userAgent || BOT_UA.test(userAgent)) {
    return NextResponse.json({ counted: false, reason: 'bot' });
  }

  const seen = seenIds(request.cookies.get(SEEN_COOKIE)?.value);
  if (seen.has(id)) {
    return NextResponse.json({ counted: false, reason: 'duplicate' });
  }

  const article = await prisma.article
    .findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true } })
    .catch(() => null);
  if (!article) {
    return NextResponse.json({ counted: false, reason: 'not_found' }, { status: 404 });
  }

  await prisma.article
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  const next = [...seen, id].slice(-SEEN_LIMIT);
  const response = NextResponse.json({ counted: true });
  response.cookies.set(SEEN_COOKIE, next.join('.'), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SEEN_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
