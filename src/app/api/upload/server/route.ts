import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';
import {
  ALLOWED_CONTENT_TYPES,
  SERVER_UPLOAD_LIMIT,
  kindOf,
  safeName,
} from '@/lib/media-meta';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * 服务端中转上传。
 *
 * 为什么需要它：浏览器直传（`@vercel/blob/client`）在部分项目上会被平台的 CORS
 * 策略拦掉——`blob.vercel-storage.com` 不返回 `Access-Control-Allow-Origin`，
 * 前端表现为进度停在 10% 后反复重试直至失败。SDK 层没有可配置的来源白名单。
 *
 * 改由本路由接收文件、在服务端调用 `put()` 落库，浏览器只与同源通信，彻底绕开跨域。
 * 代价是受 Vercel 函数请求体上限约束（4.5MB，这里按 4MB 卡），
 * 超过上限的文件由调用方改走直传或提示用户压缩。
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录，无法上传' }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: '未配置 BLOB_READ_WRITE_TOKEN' }, { status: 409 });
  }

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > SERVER_UPLOAD_LIMIT + 1024 * 1024) {
    return NextResponse.json({ error: '文件过大，超出服务器中转上限' }, { status: 413 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get('file');
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: '无法解析上传内容' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: '缺少文件' }, { status: 400 });
  }
  if (file.size > SERVER_UPLOAD_LIMIT) {
    return NextResponse.json(
      { error: '文件超过 4MB，超出服务器中转上限，请压缩后再传或改用外链' },
      { status: 413 },
    );
  }
  // 空类型时按扩展名兜底，避免个别浏览器不填 type
  if (file.type && !ALLOWED_CONTENT_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `不支持的文件类型：${file.type}` }, { status: 415 });
  }

  const type = kindOf(file);
  const pathname = `${type.toLowerCase()}/${Date.now()}-${safeName(file.name)}`;

  try {
    const blob = await put(pathname, file, { access: 'public', addRandomSuffix: true });
    return NextResponse.json({ url: blob.url, type, filename: file.name, size: file.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
