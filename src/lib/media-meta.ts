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

export function extOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

/**
 * 浏览器识别不可靠的扩展名 → 标准 MIME。
 *
 * `.exe` 在部分浏览器/系统上会报空类型或 `application/octet-stream`，
 * 而白名单是按 MIME 判定的。这里按扩展名补一个标准类型，
 * 而不是把 `application/octet-stream` 整体放行——后者等于白名单失效，
 * 任何未知二进制（含 .html/.bat 改名的文件）都能混进来。
 *
 * 只在浏览器「没给类型」或「只给了通用二进制类型」时才纠正；
 * 已经报成其它明确类型的不动，交给白名单去拒绝（避免伪造 MIME 蒙混过关）。
 */
const TYPE_BY_EXT: Record<string, string> = {
  exe: 'application/x-msdownload',
};

/** 补全后的实际内容类型，落库与白名单判定都以它为准 */
export function resolveContentType(name: string, declared: string) {
  const canonical = TYPE_BY_EXT[extOf(name)];
  if (!canonical) return declared;
  if (!declared || declared === 'application/octet-stream') return canonical;
  return declared;
}

/**
 * 返回带标准 Content-Type 的 File。
 * Blob 直传时 HTTP 的 Content-Type 就取自 `file.type`，
 * 类型为空会被存储端按 `allowedContentTypes` 拒掉，所以必须在客户端先补上。
 */
export function withCanonicalType(file: File): File {
  const next = resolveContentType(file.name, file.type);
  if (next === file.type) return file;
  return new File([file], file.name, { type: next, lastModified: file.lastModified });
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
  // Windows 可执行文件。浏览器一律当下载处理、不会执行；
  // 三种写法是各浏览器/系统对 .exe 的不同上报值，全列上才能都放行。
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/vnd.microsoft.portable-executable',
];
