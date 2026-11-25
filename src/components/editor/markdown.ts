/**
 * 编辑器「Markdown 源码 / 预览」用的轻量转换器。
 *
 * 不引第三方依赖（项目里没有 marked / turndown），只覆盖本编辑器自身会产生、
 * 以及手写文章最常用的语法子集：
 *   标题 # ~ ####、段落、**粗体**、*斜体*、~~删除线~~、`行内代码`、
 *   围栏代码块、有序 / 无序列表、引用、分割线、链接、图片、video / audio 标签。
 * 渲染时一律先转义再拼标签，视频音频只保留 src 后重建标签，避免手写 HTML 注入。
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (ch) => ESCAPES[ch]);
}

/** 行内语法：先抽出 `code`，转义其余内容，再按语法拼标签 */
function inline(text: string) {
  const codes: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_all, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = escapeHtml(out);
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" />');
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>',
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  out = out.replace(/\u0000(\d+)\u0000/g, (_all, i: string) => `<code>${escapeHtml(codes[Number(i)])}</code>`);

  return out;
}

const BLOCK_START = /^(#{1,6}\s|>|\s*[-*+]\s|\s*\d+[.)]\s|```|<\/?(?:video|audio)\b)/i;
/** 分割线：--- / *** / ___ （至少三个，允许中间夹空格） */
const HR_LINE = /^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/;
/** 段落聚合时遇到这些就该断开 */
const startsBlock = (line: string) => BLOCK_START.test(line.trim()) || HR_LINE.test(line);

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let i = 0;

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 围栏代码块：内部原样保留，不做任何解析
    if (/^```/.test(trimmed)) {
      closeList();
      const lang = trimmed.slice(3).trim();
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1;
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    // 视频 / 音频：只取 src，标签由我们重建
    const media = /^<(video|audio)\b[^>]*\bsrc="([^"]+)"[^>]*>/i.exec(trimmed);
    if (media) {
      closeList();
      const tag = media[1].toLowerCase();
      out.push(
        `<${tag} src="${media[2]}" controls preload="metadata" class="nav-${tag}"></${tag}>`,
      );
      i += 1;
      continue;
    }

    if (HR_LINE.test(line)) {
      closeList();
      out.push('<hr />');
      i += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 4);
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      closeList();
      const quoted: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote><p>${quoted.map(inline).join('<br />')}</p></blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      if (list !== 'ul') {
        closeList();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`);
      i += 1;
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      if (list !== 'ol') {
        closeList();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>`);
      i += 1;
      continue;
    }

    if (!trimmed) {
      // 空行后若紧跟同类型的列表项，视为同一个「松散列表」，不拆成多个 <ul>
      let next = i + 1;
      while (next < lines.length && !lines[next].trim()) next += 1;
      const upcoming = next < lines.length ? lines[next] : '';
      const sameList =
        list === 'ul'
          ? /^\s*[-*+]\s+/.test(upcoming)
          : list === 'ol'
            ? /^\s*\d+[.)]\s+/.test(upcoming)
            : false;
      if (!sameList) closeList();
      i += 1;
      continue;
    }

    closeList();
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      paragraph.push(lines[i]);
      i += 1;
    }
    out.push(`<p>${paragraph.map(inline).join('<br />')}</p>`);
  }

  closeList();
  return out.join('\n');
}

/* ------------------------------------------------------------------ */

function walk(node: Node): string {
  if (node.nodeType === 3) {
    return (node.textContent ?? '').replace(/\s+/g, ' ');
  }
  if (node.nodeType !== 1) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = () => Array.from(el.childNodes).map(walk).join('');

  switch (tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4': {
      const level = Number(tag[1]);
      return `\n${'#'.repeat(level)} ${inner().trim()}\n\n`;
    }
    case 'p':
      return `${inner().trim()}\n\n`;
    case 'strong':
    case 'b':
      return `**${inner()}**`;
    case 'em':
    case 'i':
      return `*${inner()}*`;
    case 's':
    case 'del':
      return `~~${inner()}~~`;
    case 'code':
      if (el.parentElement?.tagName.toLowerCase() === 'pre') return el.textContent ?? '';
      return `\`${el.textContent ?? ''}\``;
    case 'pre':
      return `\n\`\`\`\n${el.textContent ?? ''}\n\`\`\`\n\n`;
    case 'a': {
      const href = el.getAttribute('href') ?? '';
      return `[${inner().trim()}](${href})`;
    }
    case 'img': {
      const src = el.getAttribute('src') ?? '';
      return `![${el.getAttribute('alt') ?? ''}](${src})`;
    }
    case 'video':
    case 'audio': {
      const src = el.getAttribute('src') ?? '';
      return `\n<${tag} src="${src}"></${tag}>\n\n`;
    }
    case 'ul':
    case 'ol': {
      const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
      const body = items
        .map((li, index) => `${tag === 'ol' ? `${index + 1}.` : '-'} ${walk(li).trim()}`)
        .join('\n');
      return `\n${body}\n\n`;
    }
    case 'blockquote':
      return `\n> ${inner().trim().replace(/\n/g, '\n> ')}\n\n`;
    case 'hr':
      return `\n---\n\n`;
    case 'br':
      return '\n';
    case 'div':
    case 'section':
      return `${inner()}\n`;
    default:
      return inner();
  }
}

/** 浏览器端使用：依赖 DOMParser，只能在客户端组件里调用 */
export function htmlToMarkdown(html: string): string {
  if (typeof window === 'undefined') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return `${walk(doc.body).replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
