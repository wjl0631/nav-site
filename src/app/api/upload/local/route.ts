import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';

const MAX_SIZE = 100 * 1024 * 1024;

/** MIME → 扩展名白名单（不信任文件名后缀，避免把 .html 写进 public 造成存储型 XSS） */
const MIME_EXT: Record<string, { ext: string; type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' }> = {
  'image/jpeg': { ext: '.jpg', type: 'IMAGE' },
  'image/png': { ext: '.png', type: 'IMAGE' },
  'image/webp': { ext: '.webp', type: 'IMAGE' },
  'image/gif': { ext: '.gif', type: 'IMAGE' },
  'image/svg+xml': { ext: '.svg', type: 'IMAGE' },
  'video/mp4': { ext: '.mp4', type: 'VIDEO' },
  'video/webm': { ext: '.webm', type: 'VIDEO' },
  'video/quicktime': { ext: '.mov', type: 'VIDEO' },
  'video/ogg': { ext: '.ogv', type: 'VIDEO' },
  'audio/mpeg': { ext: '.mp3', type: 'AUDIO' },
  'audio/mp3': { ext: '.mp3', type: 'AUDIO' },
  'audio/wav': { ext: '.wav', type: 'AUDIO' },
  'audio/x-wav': { ext: '.wav', type: 'AUDIO' },
  'audio/ogg': { ext: '.ogg', type: 'AUDIO' },
  'audio/mp4': { ext: '.m4a', type: 'AUDIO' },
  'audio/x-m4a': { ext: '.m4a', type: 'AUDIO' },
  'audio/aac': { ext: '.aac', type: 'AUDIO' },
  'audio/webm': { ext: '.weba', type: 'AUDIO' },
  'audio/flac': { ext: '.flac', type: 'AUDIO' },
  'audio/x-flac': { ext: '.flac', type: 'AUDIO' },
  'audio/opus': { ext: '.opus', type: 'AUDIO' },
  'audio/aiff': { ext: '.aiff', type: 'AUDIO' },
  'audio/x-aiff': { ext: '.aiff', type: 'AUDIO' },
  'application/pdf': { ext: '.pdf', type: 'FILE' },
  'application/zip': { ext: '.zip', type: 'FILE' },
  'application/x-zip-compressed': { ext: '.zip', type: 'FILE' },
  'application/msword': { ext: '.doc', type: 'FILE' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', type: 'FILE' },
  'application/vnd.ms-excel': { ext: '.xls', type: 'FILE' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', type: 'FILE' },
  'application/vnd.ms-powerpoint': { ext: '.ppt', type: 'FILE' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: '.pptx', type: 'FILE' },
  'text/plain': { ext: '.txt', type: 'FILE' },
  'text/markdown': { ext: '.md', type: 'FILE' },
  'text/csv': { ext: '.csv', type: 'FILE' },
  'application/json': { ext: '.json', type: 'FILE' },
  'application/epub+zip': { ext: '.epub', type: 'FILE' },
  'application/x-rar-compressed': { ext: '.rar', type: 'FILE' },
  'application/vnd.rar': { ext: '.rar', type: 'FILE' },
  'application/x-7z-compressed': { ext: '.7z', type: 'FILE' },
};

/**
 * 本地开发用的落盘上传（未配置 Vercel Blob 时）
 * 注意：Vercel 生产环境的 public/ 是只读的构建产物，线上必须配置 BLOB_READ_WRITE_TOKEN。
 */
export async function POST(request: Request): Promise<NextResponse> {
  // public/ 在 Vercel 上属于构建产物、运行时只读，因此本通道仅限本地开发
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: '生产环境不支持本地落盘，请配置 BLOB_READ_WRITE_TOKEN 后使用 Blob 直传' },
      { status: 403 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录，无法上传' }, { status: 401 });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: '已启用 Blob 存储，请使用直传通道' }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '未收到文件' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '文件超过 100MB 限制' }, { status: 413 });
  }

  const meta = MIME_EXT[file.type];
  if (!meta) {
    return NextResponse.json({ error: `不支持的文件类型：${file.type || '未知'}` }, { status: 415 });
  }

  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${meta.ext}`;
  const dir = join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    url: `/uploads/${filename}`,
    type: meta.type,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  });
}
