'use client';

import * as React from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { looksLikeMarkdown, markdownFromEditorDoc } from '@/lib/markdown-fallback';
import { formatSize, uploadAndRegister, type MediaKind } from '@/lib/upload-client';
import {
  AudioIcon,
  Bold,
  Code,
  External,
  Heading,
  ImageIcon,
  Italic,
  Link2,
  ListIcon,
  ListOrdered,
  Paperclip,
  Quote,
  Underline as UnderlineIcon,
  VideoIcon,
} from '@/components/ui/icons';
import { AudioNode, VideoNode } from './media-nodes';
import { htmlToMarkdown, markdownToHtml } from './markdown';

export type EditorPayload = { json: unknown; html: string };

/** 附件按钮的 accept：只列常用文档，服务端另有 MIME 白名单兜底 */
const ATTACHMENT_ACCEPT =
  '.pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.epub,.rar,.7z';

export function RichEditor({
  initialContent,
  onChange,
}: {
  initialContent?: unknown;
  onChange: (payload: EditorPayload) => void;
}) {
  const [uploading, setUploading] = React.useState<MediaKind | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState('');
  const [mode, setMode] = React.useState<'rich' | 'md'>('rich');
  const [markdown, setMarkdown] = React.useState('');

  const imageInput = React.useRef<HTMLInputElement>(null);
  const videoInput = React.useRef<HTMLInputElement>(null);
  const audioInput = React.useRef<HTMLInputElement>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  // 早期文章把 Markdown 源码当纯文本存进了正文，这里在打开时补转成富文本
  const legacyMarkdown = React.useMemo(() => markdownFromEditorDoc(initialContent), [initialContent]);
  const content = React.useMemo(
    () =>
      legacyMarkdown
        ? (markdownToHtml(legacyMarkdown) as never)
        : ((initialContent as never) ?? { type: 'doc', content: [{ type: 'paragraph' }] }),
    [initialContent, legacyMarkdown],
  );

  // handlePaste 里拿不到 editor 变量（尚未初始化），用 ref 兜住
  const editorRef = React.useRef<Editor | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        // StarterKit v3 已内置 Link / Underline，无需重复注册
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      VideoNode,
      AudioNode,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'tiptap prose-article max-w-none',
        spellcheck: 'false',
      },
      /**
       * 粘贴 Markdown 源码时直接转成富文本。
       * 带 text/html 的剪贴板（从网页、Word、其他编辑器复制）保留原有格式，不插手。
       */
      handlePaste: (_view, event) => {
        const clipboard = event.clipboardData;
        if (!clipboard || clipboard.getData('text/html')) return false;

        const text = clipboard.getData('text/plain');
        if (!text.trim() || !looksLikeMarkdown(text)) return false;

        const target = editorRef.current;
        if (!target) return false;

        event.preventDefault();
        target.commands.insertContent(markdownToHtml(text));
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange({ json: e.getJSON(), html: e.getHTML() });
    },
  });

  React.useEffect(() => {
    editorRef.current = editor ?? null;
  }, [editor]);

  // 补转过内容时回写一次，免得作者不改动直接保存又把纯文本存回去
  const syncedLegacy = React.useRef(false);
  React.useEffect(() => {
    if (!editor || !legacyMarkdown || syncedLegacy.current) return;
    syncedLegacy.current = true;
    onChange({ json: editor.getJSON(), html: editor.getHTML() });
  }, [editor, legacyMarkdown, onChange]);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      underline: e?.isActive('underline') ?? false,
      strike: e?.isActive('strike') ?? false,
      h2: e?.isActive('heading', { level: 2 }) ?? false,
      h3: e?.isActive('heading', { level: 3 }) ?? false,
      bullet: e?.isActive('bulletList') ?? false,
      ordered: e?.isActive('orderedList') ?? false,
      quote: e?.isActive('blockquote') ?? false,
      code: e?.isActive('codeBlock') ?? false,
      link: e?.isActive('link') ?? false,
    }),
  });

  async function handleUpload(kind: MediaKind, file: File | undefined | null) {
    if (!file || !editor) return;
    setError('');
    setUploading(kind);
    setProgress(0);
    try {
      const media = await uploadAndRegister(file, setProgress);
      if (kind === 'IMAGE') {
        editor.chain().focus().setImage({ src: media.url, alt: file.name }).run();
      } else if (kind === 'FILE') {
        // 附件插成一个下载链接：Blob 域名带上 ?download=1 让浏览器直接下载而不是预览
        const href = media.url.includes('blob.vercel-storage.com')
          ? `${media.url}?download=1`
          : media.url;
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `📎 ${media.filename}（${formatSize(media.size)}）`,
                marks: [{ type: 'link', attrs: { href } }],
              },
            ],
          })
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent({ type: kind === 'VIDEO' ? 'video' : 'audio', attrs: { src: media.url } })
          .run();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败，请检查 Blob 配置');
    } finally {
      setUploading(null);
      setProgress(0);
    }
  }

  function insertVideoUrl() {
    if (!editor) return;
    const url = window.prompt('粘贴视频直链地址（.mp4 / .webm，或已上传到 CDN 的地址）');
    if (!url) return;
    editor.chain().focus().insertContent({ type: 'video', attrs: { src: url.trim() } }).run();
  }

  function insertAudioUrl() {
    if (!editor) return;
    const url = window.prompt('粘贴音频直链地址（.mp3 / .wav / .flac / .m4a 等）');
    if (!url) return;
    editor.chain().focus().insertContent({ type: 'audio', attrs: { src: url.trim() } }).run();
  }

  /** 视频 / 音频外链合并成一个入口，按后缀自动判断插哪种媒体块 */
  function insertMediaUrl() {
    if (!editor) return;
    const url = window.prompt('粘贴视频或音频直链地址（.mp4 / .webm / .mp3 / .wav / .flac 等）');
    if (!url) return;

    const src = url.trim();
    const isAudio = /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|weba|aif|aiff)(?:[?#]|$)/i.test(src);
    const isVideo = /\.(mp4|webm|mov|ogv|m4v)(?:[?#]|$)/i.test(src);
    if (!isAudio && !isVideo) {
      setError('外链需以 .mp4 / .webm / .mov 或 .mp3 / .wav / .flac / .m4a 结尾，无法判断是视频还是音频');
      return;
    }

    setError('');
    editor
      .chain()
      .focus()
      .insertContent({ type: isAudio ? 'audio' : 'video', attrs: { src } })
      .run();
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('输入链接地址（留空则移除链接）', prev ?? 'https://');
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }

  /** 把当前正文转成 Markdown 原文，进入源码模式 */
  function enterMarkdown() {
    if (!editor) return;
    setMarkdown(htmlToMarkdown(editor.getHTML()));
    setError('');
    setMode('md');
  }

  /** 源码改动后立刻回写编辑器，保证保存时 json / html 都是最新的 */
  function applyMarkdown(text: string) {
    if (!editor) return;
    setMarkdown(text);
    editor.commands.setContent(markdownToHtml(text), { emitUpdate: false });
    onChange({ json: editor.getJSON(), html: editor.getHTML() });
  }

  function exitMarkdown() {
    if (!editor) return;
    editor.commands.setContent(markdownToHtml(markdown), { emitUpdate: false });
    onChange({ json: editor.getJSON(), html: editor.getHTML() });
    setMode('rich');
  }

  if (!editor) {
    return <div className="h-96 animate-pulse rounded-2xl border border-border bg-surface-2/50" />;
  }

  return (
    <div className="space-y-2">
      {/* 工具栏独立在卡片之外：sticky 才能相对页面生效，不会被卡片的 overflow-hidden 撑出 56px 偏移 */}
      <div
        className={cn(
          'sticky top-12 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface/95 px-1.5 py-1 shadow-sm backdrop-blur',
          // .is-md-mode 会把除「模式切换」以外的子元素变灰并禁用（见 globals.css）
          mode === 'md' && 'is-md-mode',
        )}
      >
        <ToolButton active={active?.bold} onClick={() => editor.chain().focus().toggleBold().run()} label="加粗">
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton active={active?.italic} onClick={() => editor.chain().focus().toggleItalic().run()} label="斜体">
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          active={active?.underline}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label="下划线"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton active={active?.strike} onClick={() => editor.chain().focus().toggleStrike().run()} label="删除线">
          <span className="text-[13px] line-through">S</span>
        </ToolButton>

        <Divider />

        <ToolButton active={active?.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="二级标题">
          <span className="text-[11px] font-bold">H2</span>
        </ToolButton>
        <ToolButton active={active?.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="三级标题">
          <span className="text-[11px] font-bold">H3</span>
        </ToolButton>
        <ToolButton active={active?.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()} label="无序列表">
          <ListIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton active={active?.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="有序列表">
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <ToolButton active={active?.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="引用">
          <Quote className="h-4 w-4" />
        </ToolButton>
        <ToolButton active={active?.code} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="代码块">
          <Code className="h-4 w-4" />
        </ToolButton>
        <ToolButton active={active?.link} onClick={setLink} label="链接">
          <Link2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} label="分割线">
          <Heading className="h-4 w-4 rotate-90" />
        </ToolButton>

        <Divider />

        <ToolButton onClick={() => imageInput.current?.click()} label="插入图片" highlight>
          <ImageIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => videoInput.current?.click()} onContextMenu={insertVideoUrl} label="上传视频" highlight>
          <VideoIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => audioInput.current?.click()} onContextMenu={insertAudioUrl} label="上传音频" highlight>
          <AudioIcon className="h-4 w-4" />
        </ToolButton>
        <ToolButton onClick={() => fileInput.current?.click()} label="上传附件（PDF / 压缩包 / 文档）" highlight>
          <Paperclip className="h-4 w-4" />
        </ToolButton>
        {/* 视频 / 音频外链合成一个图标入口，按后缀自动识别 */}
        <ToolButton onClick={insertMediaUrl} label="插入媒体外链（视频 / 音频直链）" highlight>
          <External className="h-4 w-4" />
        </ToolButton>

        {/* 模式切换紧跟在外链之后，和按钮同一行顺排，不单独靠右 */}
        <Divider />

        <button
          type="button"
          data-mode-toggle
          onClick={mode === 'rich' ? enterMarkdown : exitMarkdown}
          title={mode === 'rich' ? '切换到 Markdown 源码' : '切回富文本编辑'}
          className={cn(
            'h-7 rounded-lg border px-2.5 text-[11px] transition',
            mode === 'md'
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-border text-ink-soft hover:bg-surface-2 hover:text-ink',
          )}
        >
          {mode === 'rich' ? 'Markdown' : '富文本'}
        </button>

        {uploading && (
          <span data-mode-toggle className="pl-1 text-[11px] text-brand">
            上传中 {progress}%
          </span>
        )}
      </div>

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUpload('IMAGE', e.target.files?.[0])}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleUpload('VIDEO', e.target.files?.[0])}
      />
      <input
        ref={audioInput}
        type="file"
        accept="audio/*,.flac,.opus,.aiff,.aif"
        className="hidden"
        onChange={(e) => handleUpload('AUDIO', e.target.files?.[0])}
      />
      <input
        ref={fileInput}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={(e) => handleUpload('FILE', e.target.files?.[0])}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className={mode === 'rich' ? undefined : 'hidden'}>
          <EditorContent editor={editor} />
        </div>

        {mode === 'md' && (
          <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <textarea
              value={markdown}
              onChange={(e) => applyMarkdown(e.target.value)}
              spellCheck={false}
              aria-label="Markdown 源码"
              className="min-h-[26rem] w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-[1.75] text-ink outline-none lg:min-h-[30rem]"
            />
            <div className="min-h-[26rem] overflow-x-auto px-4 py-3 lg:min-h-[30rem]">
              <div
                className="prose-article"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="border-t border-border bg-danger/10 px-3 py-1.5 text-[11px] text-danger">{error}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-2/40 px-3 py-1.5 text-[11px] text-muted">
          <span>{countWords(editor.getText())} 字</span>
          <span>
            {mode === 'md'
              ? '源码模式：左边写 Markdown，右边实时预览；切回富文本后照常保存'
              : '提示：选中媒体块后按 Delete 可移除；外链入口按后缀自动识别视频或音频'}
          </span>
        </div>
      </div>
    </div>
  );
}

function countWords(text: string) {
  return text.replace(/\s/g, '').length;
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-border" />;
}

function ToolButton({
  children,
  onClick,
  active,
  label,
  highlight,
  onContextMenu,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
  highlight?: boolean;
  onContextMenu?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={(e) => {
        if (!onContextMenu) return;
        e.preventDefault();
        onContextMenu();
      }}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-lg transition',
        active
          ? 'bg-brand-soft text-brand'
          : highlight
            ? 'text-ink-soft hover:bg-surface-2 hover:text-brand'
            : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
