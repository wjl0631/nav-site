/** 拼接 className，过滤空值 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/** 中文友好的 slug：保留文字/字母/数字，其余转连字符 */
export function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/['"’]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base.slice(0, 80);
}

/** slug 兜底，确保唯一性由调用方追加随机后缀 */
export function safeSlug(input: string, fallbackPrefix = 'item') {
  const slug = slugify(input);
  return slug || `${fallbackPrefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai',
  }).format(d);
}

/** 归一化外链：缺协议时补 https://；站内相对路径原样保留 */
export function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return '';
  if (value.startsWith('/')) return value;
  if (/^(https?:)?\/\//i.test(value)) return value.replace(/^\/\//, 'https://');
  if (/^(mailto|tel):/i.test(value)) return value;
  return `https://${value}`;
}

/** 从 URL 推导站点图标 */
export function faviconOf(url: string) {
  try {
    const { hostname, protocol } = new URL(normalizeUrl(url));
    if (!hostname) return '';
    return `${protocol}//${hostname}/favicon.ico`;
  } catch {
    return '';
  }
}

/**
 * 图标兜底服务：站点自己的 /favicon.ico 不可达时，用 DuckDuckGo 的聚合图标。
 * 该服务按域名返回，绝大多数站点都有；未知域名会给一个通用地球图标。
 */
export function duckIconOf(url: string) {
  const host = hostOf(url);
  return host ? `https://icons.duckduckgo.com/ip3/${host}.ico` : '';
}

export function hostOf(url: string) {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * 判断图标字段里存的是「图片地址」还是「emoji 文本」。
 * emoji 不可能以 http(s):// 或 data:image/ 开头，因此这个判定不存在歧义，
 * 也就无需维护扩展名白名单（Blob、CDN 的图标地址常常没有后缀）。
 */
export function isImageIcon(value?: string | null) {
  return /^(https?:\/\/|data:image\/)/i.test((value ?? '').trim());
}

/** Iconify 系的图标 API 主机名 */
const ICONIFY_HOST = /(^|\.)(iconify\.design|simplesvg\.com|unisvg\.com)$/i;

/**
 * 修正 Iconify 的地址写法。
 * Iconify 组件里引用图标写作「前缀:名称」，但它的 HTTP 接口要求「前缀/名称」，
 * 冒号写法会返回 404 且响应体为空，页面表现为破图。这里静默纠正成斜杠形式。
 */
export function normalizeIconSrc(value?: string | null) {
  const raw = (value ?? '').trim();
  if (!/^https?:\/\//i.test(raw)) return raw;

  try {
    const url = new URL(raw);
    if (ICONIFY_HOST.test(url.hostname) && url.pathname.includes(':')) {
      url.pathname = url.pathname.replace(':', '/');
      return url.toString();
    }
  } catch {
    return raw;
  }
  return raw;
}

export function truncate(text: string, max = 120) {
  const plain = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

/**
 * 动态路由参数解码。
 * Next 15 的 params 可能是未解码的百分号编码串（中文 slug 场景），
 * 直接拿去查库会匹配不到，这里统一解码一次。
 */
export function decodeParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function absoluteUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
