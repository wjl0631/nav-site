import sanitizeHtml from 'sanitize-html';

/**
 * 文章正文 HTML 清洗（写入时执行一次，前台直出）
 * 放行图片 / 视频 / 音频 / 白名单站点的 iframe 嵌入
 */
export function cleanArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
      'blockquote', 'pre', 'code', 'ul', 'ol', 'li',
      'a', 'img', 'figure', 'figcaption',
      'video', 'audio', 'source', 'iframe',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      video: ['src', 'controls', 'poster', 'preload', 'playsinline', 'width', 'height', 'loop', 'muted'],
      audio: ['src', 'controls', 'preload', 'loop'],
      source: ['src', 'type'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'title', 'loading'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'], video: ['http', 'https'], audio: ['http', 'https'], source: ['http', 'https'] },
    allowedIframeHostnames: [
      'www.youtube.com',
      'www.youtube-nocookie.com',
      'player.bilibili.com',
      'player.vimeo.com',
      'music.163.com',
    ],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
      }),
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
    disallowedTagsMode: 'discard',
  });
}

/** 纯文本摘要，用于自动生成 summary / SEO 描述 */
export function htmlToText(html: string, max = 160): string {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
