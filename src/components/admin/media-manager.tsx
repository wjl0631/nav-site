'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { deleteMediaAction } from '@/actions/media';
import { formatSize, uploadAndRegister, type MediaKind } from '@/lib/upload-client';
import { cn, formatDate } from '@/lib/utils';
import { AudioIcon, ImageIcon, Paperclip, Trash, VideoIcon } from '@/components/ui/icons';
import { AsyncButton } from './async-button';
import { useToast } from './toast';

export type MediaRow = {
  id: string;
  url: string;
  type: MediaKind;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};

const FILTERS: Array<{ key: 'ALL' | MediaKind; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'IMAGE', label: '图片' },
  { key: 'VIDEO', label: '视频' },
  { key: 'AUDIO', label: '音频' },
  { key: 'FILE', label: '附件' },
];

export type MediaUsage = {
  used: number;
  count: number;
  quota: number;
  byType: Array<{ type: MediaKind; size: number; count: number }>;
};

const TYPE_LABELS: Record<MediaKind, string> = {
  IMAGE: '图片',
  VIDEO: '视频',
  AUDIO: '音频',
  FILE: '附件',
};

/** 用量进度条与提示的配色，按占用比例分级 */
function usageTone(ratio: number) {
  if (ratio >= 0.9) return { bar: 'bg-danger', text: 'text-danger', note: 'danger' as const };
  if (ratio >= 0.7) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', note: 'warn' as const };
  return { bar: 'bg-brand', text: 'text-muted', note: 'ok' as const };
}

export function MediaManager({ media, usage }: { media: MediaRow[]; usage: MediaUsage }) {
  const { push } = useToast();
  const router = useRouter();
  const [filter, setFilter] = React.useState<'ALL' | MediaKind>('ALL');
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const list = filter === 'ALL' ? media : media.filter((m) => m.type === filter);

  const ratio = usage.quota > 0 ? Math.min(1, usage.used / usage.quota) : 0;
  const tone = usageTone(ratio);
  const percent = (ratio * 100).toFixed(ratio < 0.1 ? 1 : 0);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    try {
      let compressedCount = 0;
      let savedBytes = 0;
      for (const file of Array.from(files)) {
        const result = await uploadAndRegister(file, setProgress);
        if (result.compressed) {
          compressedCount += 1;
          savedBytes += result.originalSize - result.size;
        }
      }
      push(
        compressedCount > 0
          ? `已上传 ${files.length} 个文件，压缩 ${compressedCount} 张，节省 ${formatSize(savedBytes)}`
          : `已上传 ${files.length} 个文件`,
      );
      router.refresh();
    } catch (error) {
      push(error instanceof Error ? error.message : '上传失败，请检查 BLOB_READ_WRITE_TOKEN', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      push('链接已复制');
    } catch {
      push('复制失败，请手动选择', 'error');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">媒体中心</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">共 {media.length} 个文件，支持图片 / 视频 / 音频</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-medium text-brand-ink transition hover:opacity-90 disabled:opacity-60"
        >
          {uploading ? `上传中 ${progress}%` : '上传文件'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.flac,.opus,.aiff,.pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.epub,.rar,.7z"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <section className="rounded-xl border border-border bg-surface p-3.5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-ink">存储用量</h3>
          <span className={cn('text-[12px] tabular-nums', tone.text)}>
            {formatSize(usage.used)} / {formatSize(usage.quota)} · {percent}%
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn('h-full rounded-full transition-all', tone.bar)}
            style={{ width: `${ratio > 0 ? Math.max(ratio * 100, 1) : 0}%` }}
          />
        </div>

        <p className="mt-2 text-[11px] text-muted">
          共 {usage.count} 个文件
          {[...usage.byType]
            .sort((a, b) => b.size - a.size)
            .map((item) => ` · ${TYPE_LABELS[item.type]} ${formatSize(item.size)}`)
            .join('')}
        </p>

        {tone.note === 'danger' && (
          <p className="mt-2 rounded-lg bg-danger/10 px-2.5 py-2 text-[11px] leading-relaxed text-danger">
            已接近免费额度上限。超出后 Vercel Blob 将被暂停 30 天，站内图片全部无法访问——请立即清理不再使用的文件，或升级 Pro。
          </p>
        )}
        {tone.note === 'warn' && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            免费额度已用掉七成以上。建议清理不再使用的文件；新上传的图片会自动压缩为 WebP，可再用 BLOB_QUOTA_GB 调整这里的额度基准。
          </p>
        )}
      </section>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-xl border-2 border-dashed px-5 py-5 text-center transition',
          dragging ? 'border-brand bg-brand-soft/40' : 'border-border bg-surface/60',
        )}
      >
        <p className="text-[13px] text-ink-soft">
          把文件拖到这里，或
          <button type="button" onClick={() => inputRef.current?.click()} className="mx-1 text-brand hover:underline">
            选择文件
          </button>
        </p>
        <p className="mt-1 text-[11px] text-muted">单个文件上限 100MB，上传后可直接复制地址插入文章</p>
        {uploading && (
          <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[12px] transition',
              filter === f.key ? 'bg-brand text-brand-ink' : 'border border-border bg-surface text-ink-soft hover:bg-surface-2',
            )}
          >
            {f.label}
            <span className="ml-1 opacity-70">
              {f.key === 'ALL' ? media.length : media.filter((m) => m.type === f.key).length}
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink">还没有媒体文件</p>
          <p className="mt-1 text-xs text-muted">上传后可在文章编辑器中直接插入。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]"
            >
              <div className="relative aspect-[4/3] bg-surface-2">
                {item.type === 'IMAGE' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.filename} loading="lazy" className="h-full w-full object-cover" />
                ) : item.type === 'VIDEO' ? (
                  <video src={item.url} controls preload="metadata" className="h-full w-full bg-black object-contain" />
                ) : item.type === 'AUDIO' ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                    <AudioIcon className="h-7 w-7 text-muted" />
                    <audio src={item.url} controls className="w-full" />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 p-3 text-center">
                    <Paperclip className="h-7 w-7 text-muted" />
                    <span className="line-clamp-2 text-[10.5px] text-muted">
                      {item.filename.split('.').pop()?.toUpperCase() || '文件'}
                    </span>
                  </div>
                )}
                <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md bg-black/55 text-white backdrop-blur">
                  {item.type === 'IMAGE' ? (
                    <ImageIcon className="h-3.5 w-3.5" />
                  ) : item.type === 'VIDEO' ? (
                    <VideoIcon className="h-3.5 w-3.5" />
                  ) : item.type === 'AUDIO' ? (
                    <AudioIcon className="h-3.5 w-3.5" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5" />
                  )}
                </span>
              </div>

              <div className="p-2">
                <p className="truncate text-[12px] font-medium text-ink" title={item.filename}>
                  {item.filename}
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  {formatSize(item.size)} · {formatDate(item.createdAt)}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copy(item.url)}
                    className="flex-1 rounded-lg border border-border px-2 py-1.5 text-[11px] text-ink-soft transition hover:bg-surface-2"
                  >
                    复制链接
                  </button>
                  <AsyncButton
                    action={() => deleteMediaAction(item.id)}
                    confirm="确定删除该媒体文件？已插入文章中的引用会失效。"
                    className="rounded-lg border border-border p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                    title="删除"
                    ariaLabel="删除媒体"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </AsyncButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
