'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveArticleAction } from '@/actions/article';
import { uploadAndRegister } from '@/lib/upload-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Field, Input, Switch, Textarea } from '@/components/ui/field';
import { ChevronLeft, ImageIcon, Trash, X } from '@/components/ui/icons';
import { RichEditor, type EditorPayload } from '@/components/editor/rich-editor';
import { useToast } from './toast';

export type ArticleDraft = {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  coverUrl: string;
  content: unknown;
  contentHtml: string;
  status: 'DRAFT' | 'PUBLISHED';
  isFeatured: boolean;
  tags: string;
  seoTitle: string;
  seoDescription: string;
};

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export function ArticleForm({ initial }: { initial: ArticleDraft }) {
  const router = useRouter();
  const { push } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const contentRef = React.useRef<{ json: unknown; html: string }>({
    json: initial.content ?? EMPTY_DOC,
    html: initial.contentHtml ?? '',
  });

  const [coverUrl, setCoverUrl] = React.useState(initial.coverUrl);
  const [featured, setFeatured] = React.useState(initial.isFeatured);
  const [coverUploading, setCoverUploading] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');
  const coverInput = React.useRef<HTMLInputElement>(null);

  function onEditorChange(payload: EditorPayload) {
    contentRef.current = { json: payload.json, html: payload.html };
  }

  async function uploadCover(file: File | undefined | null) {
    if (!file) return;
    setCoverUploading(true);
    setError('');
    try {
      const media = await uploadAndRegister(file);
      setCoverUrl(media.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '封面上传失败');
    } finally {
      setCoverUploading(false);
    }
  }

  function save(status: 'DRAFT' | 'PUBLISHED') {
    const form = formRef.current;
    if (!form) return;

    const title = (form.elements.namedItem('title') as HTMLInputElement | null)?.value.trim() ?? '';
    if (!title) {
      setError('请填写文章标题');
      return;
    }

    const formData = new FormData(form);
    if (initial.id) formData.set('id', initial.id);
    formData.set('status', status);
    formData.set('isFeatured', String(featured));
    formData.set('coverUrl', coverUrl);
    formData.set('contentHtml', contentRef.current.html || '');
    formData.set('contentJson', JSON.stringify(contentRef.current.json ?? EMPTY_DOC));
    setError('');

    startTransition(async () => {
      const result = await saveArticleAction(formData);
      if (result.ok) {
        push(result.message ?? '已保存');
        router.push('/admin/articles');
        router.refresh();
      } else {
        setError(result.error);
        push(result.error, 'error');
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        save('DRAFT');
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/articles"
          className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          返回文章列表
        </Link>
        <div className="flex items-center gap-2">
          <span className="mr-1 hidden text-[11px] text-muted sm:inline">
            {initial.id ? '编辑中' : '新文章'}
          </span>
          <Button variant="outline" onClick={() => save('DRAFT')} disabled={pending}>
            保存草稿
          </Button>
          <Button onClick={() => save('PUBLISHED')} disabled={pending}>
            {pending ? '保存中…' : initial.status === 'PUBLISHED' ? '更新并发布' : '发布'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      )}

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="order-2 min-w-0 space-y-3 lg:order-1">
          <input
            name="title"
            defaultValue={initial.title}
            placeholder="请输入文章标题…"
            maxLength={120}
            className="w-full border-0 bg-transparent px-1 text-[21px] font-semibold tracking-tight text-ink outline-none placeholder:text-muted/70 sm:text-[24px]"
          />
          <Textarea
            name="summary"
            defaultValue={initial.summary}
            rows={2}
            maxLength={300}
            placeholder="摘要（可选，留空将自动截取正文开头，用于列表与 SEO 描述）"
            className="border-0 bg-surface-2/60 text-[13px] shadow-none focus:ring-0"
          />

          <RichEditor initialContent={initial.content ?? EMPTY_DOC} onChange={onEditorChange} />
        </div>

        <aside className="order-1 space-y-3 lg:order-2">
          {/* 封面 */}
          <section className="rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
            <h3 className="mb-1.5 text-[12px] font-semibold text-ink">封面图</h3>
            <div
              className={cn(
                'relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-dashed border-border bg-surface-2',
                coverUrl && 'border-solid',
              )}
            >
              {coverUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt="封面预览"
                    className="h-full w-full object-cover"
                    onError={() => setCoverUrl('')}
                  />
                  <button
                    type="button"
                    onClick={() => setCoverUrl('')}
                    aria-label="移除封面"
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted transition hover:text-brand"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-[11px]">{coverUploading ? '上传中…' : '点击上传封面'}</span>
                </button>
              )}
            </div>
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadCover(e.target.files?.[0])}
            />
            <div className="mt-2 flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => coverInput.current?.click()}
                disabled={coverUploading}
              >
                上传图片
              </Button>
              {coverUrl && (
                <Button variant="ghost" size="sm" onClick={() => setCoverUrl('')} aria-label="清除封面">
                  <Trash className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </section>

          {/* 发布设置 */}
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
            <h3 className="text-[12px] font-semibold text-ink">发布设置</h3>
            <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-[12px]">
              <span className="text-muted">当前状态</span>
              <span className={cn('font-medium', initial.status === 'PUBLISHED' ? 'text-emerald-600' : 'text-ink-soft')}>
                {initial.status === 'PUBLISHED' ? '已发布' : '草稿'}
              </span>
            </div>
            <Switch checked={featured} onChange={setFeatured} label="标记为精选" id="article-featured" />

            <Field label="Slug" htmlFor="slug" hint="留空根据标题自动生成">
              <Input
                id="slug"
                name="slug"
                defaultValue={initial.slug}
                maxLength={90}
                placeholder="my-article"
                className="font-mono text-[12px]"
              />
            </Field>

            <Field label="标签" htmlFor="tags" hint="用逗号分隔，最多 8 个">
              <Input id="tags" name="tags" defaultValue={initial.tags} placeholder="教程, 前端" />
            </Field>
          </section>

          {/* SEO */}
          <details className="rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]">
            <summary className="cursor-pointer text-[12px] font-semibold text-ink">SEO 设置</summary>
            <div className="mt-3 space-y-3">
              <Field label="SEO 标题" htmlFor="seoTitle" hint="留空使用文章标题">
                <Input id="seoTitle" name="seoTitle" defaultValue={initial.seoTitle} maxLength={120} />
              </Field>
              <Field label="SEO 描述" htmlFor="seoDescription" hint="留空使用摘要">
                <Textarea
                  id="seoDescription"
                  name="seoDescription"
                  defaultValue={initial.seoDescription}
                  rows={3}
                  maxLength={200}
                />
              </Field>
            </div>
          </details>
        </aside>
      </div>
    </form>
  );
}
