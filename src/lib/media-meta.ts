/**
 * 媒体上传的共享元信息。
 *
 * 客户端组件、服务端路由、上传中转都要用到这些判断，
 * 抽出来避免三处各写一份白名单而逐渐走样。
 * 这里只能放纯函数与常量（客户端会 import）。
 */

export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

export function kindOf(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type.startsWith('audio/')) return 'AUDIO';
  if (file.type.startsWith('image/')) return 'IMAGE';
  return 'FILE';
}

export function safeName(name: string) {
  const cleaned = name.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-');
  return cleaned.slice(-60) || 'file';
}

/**
 * 服务端中转上传的体积上限。
 *
 * Vercel 函数的请求体硬上限是 4.5MB，超过的请求在到达代码之前就被拒了，
 * 所以这里留一点余量取 4MB。超过这个值的文件只能走浏览器直传（或改用外链）。
 */
export const SERVER_UPLOAD_LIMIT = 4 * 1024 * 1024;

/**
 * Blob 是否可用。
 *
 * 老式存储会给 BLOB_READ_WRITE_TOKEN；新式「连接存储」默认走 OIDC，
 * 只注入 BLOB_STORE_ID（+ BLOB_WEBHOOK_PUBLIC_KEY），SDK 会自动取短期令牌。
 * 两种都要认，否则换了存储之后会被误判成「未配置」。
 */
export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/webm',
  'audio/x-m4a',
  'audio/flac',
  'audio/x-flac',
  'audio/opus',
  'audio/aiff',
  'audio/x-aiff',
  // 通用附件：只放行会在浏览器里当文件下载的类型，避免 svg/html 之类可执行内容
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/epub+zip',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
];
