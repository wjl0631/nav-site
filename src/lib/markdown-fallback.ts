/**
 * 「未渲染的 Markdown 正文」兼容层。
 *
 * 场景：早期文章（或直接粘进富文本的 Markdown）入库时，contentHtml 里只有
 * 一串 `<p>`，正文躺着 `#`、`**`、`- ` 这些源码符号，前台渲染出来就是一堆纯文本。
 *
 * 这里做两件事：
 *   1. looksLikeMarkdown —— 判断整篇是不是「被当成纯文本存下来的 Markdown」；
 *   2. normalizeArticleHtml —— 是的话先还原成 Markdown 再走 markdownToHtml。
 *
 * 判定刻意保守：只要正文里出现过任何块级标签（标题、列表、引用、代码块、图片…），
 * 就认为已经是正常富文本，一律不动。
 */
import { markdownToHtml } from '@/components/editor/markdown';

/** 出现这些标签说明正文已经是正常富文本，不再二次加工 */
const BLOCK_TAGS = /<(h[1-6]|ul|ol|blockquote|pre|hr|table|img|video|audio|figure|iframe|section)\b/i;

/** 强信号：命中任一条就基本可以认定是 Markdown 原文 */
const STRONG_SIGNALS = [
  /^#{1,6}\s+\S/m, // 标题
  /^\s*```/m, // 围栏代码块
  /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/m, // 分割线
  /^>\s?\S/m, // 引用
];

/** 弱信号：需要多条同时命中才判定，避免误伤普通文本 */
const WEAK_SIGNALS = [
  /^\s*[-*+]\s+\S/m, // 无序列表
  /^\s*\d+[.)]\s+\S/m, // 有序列表
  /\*\*[^*\n]+\*\*/, // 粗体
  /~~[^~\n]+~~/, // 删除线
  /\[[^\]\n]+\]\([^)\s]+\)/, // 链接
];

const ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&amp;': '&',
};

function decodeEntities(value: string) {
  return value.replace(/&(lt|gt|quot|#39|nbsp|amp);/g, (all) => ENTITIES[all] ?? all);
}

/**
 * 把「只有段落 + 行内标记」的 HTML 还原成 Markdown 源码。
 * 只处理本场景会出现的简单标签，不追求成为通用反解析器。
 */
export function markdownFromSimpleHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, code: string) => `\`${code}\``)
      .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, text: string) => `**${text}**`)
      .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, text: string) => `*${text}*`)
      .replace(/<(s|del)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _tag, text: string) => `~~${text}~~`)
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => `[${text}](${href})`)
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 这段文本像不像没渲染的 Markdown 源码 */
export function looksLikeMarkdown(text: string): boolean {
  const strong = STRONG_SIGNALS.some((re) => re.test(text));
  const weak = WEAK_SIGNALS.filter((re) => re.test(text)).length;
  return strong || weak >= 2;
}

/**
 * 正文兜底：疑似「纯文本 Markdown」时现场渲染成 HTML，其余原样返回。
 * 只做字符串处理，服务端 / 客户端都能调用。
 */
export function normalizeArticleHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (BLOCK_TAGS.test(html)) return html;

  const markdown = markdownFromSimpleHtml(html);
  if (!markdown || !looksLikeMarkdown(markdown)) return html;
  return markdownToHtml(markdown);
}

/** 摘要兜底：把 Markdown 记号抹掉，只留可读纯文本 */export function markdownToPlainText(value: string | null | undefined): string {
  if (!value) return '';
  return decodeEntities(
    value
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+[.)]\s+/gm, '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__|~~|`)/g, '')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

type DocNode = { type?: string; text?: string; marks?: { type?: string }[]; content?: DocNode[] };

/**
 * 编辑器里那份 Tiptap JSON 是不是「一堆纯文本段落 + Markdown 源码」。
 * 是则还原成 Markdown 源码返回，否则返回 null。后台打开旧文章时用它兜底，
 * 免得作者在富文本里看到 `#` 和 `**`。
 */
export function markdownFromEditorDoc(doc: unknown): string | null {
  const blocks = (doc as DocNode | null)?.content;
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const lines: string[] = [];
  for (const block of blocks) {
    if (block?.type !== 'paragraph') return null;
    lines.push(
      (block.content ?? [])
        .map((child) => {
          const text = child.text ?? '';
          const marks = (child.marks ?? []).map((mark) => mark.type);
          if (marks.includes('code')) return `\`${text}\``;
          if (marks.includes('bold')) return `**${text}**`;
          if (marks.includes('italic')) return `*${text}*`;
          return text;
        })
        .join(''),
    );
  }

  // 每个段落都是一整段，用空行分隔，避免被当软换行合并进同一个 <p>
  const text = lines.join('\n\n');
  return looksLikeMarkdown(text) ? text : null;
}

