'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { deleteLinkAction, moveLinkAction, saveLinkAction, toggleLinkAction } from '@/actions/link';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { SiteIcon } from '@/components/ui/site-icon';
import { ChevronDown, ChevronUp, Eye, EyeOff, LinkIcon, Pencil, Plus, Star, Trash } from '@/components/ui/icons';
import { cn, faviconOf, hostOf } from '@/lib/utils';
import { Badge } from './badge';
import { AsyncButton } from './async-button';
import { useToast } from './toast';

export type LinkRow = {
  id: string;
  categoryId: string;
  title: string;
  url: string;
  description: string | null;
  iconUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  isFeatured: boolean;
  clickCount: number;
  categoryName: string;
};

export type CategoryOption = { id: string; name: string };

/** 链接地址输入框左侧的小图标预览：与前台同一套三级回退 */
function IconPreview({ src, url, title }: { src: string; url: string; title: string }) {
  return (
    <SiteIcon
      src={src}
      url={url}
      title={title}
      size="xxs"
      className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
      fallback={<LinkIcon className="h-3 w-3" />}
    />
  );
}

export function LinkManager({
  links,
  categories,
}: {
  links: LinkRow[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LinkRow | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');

  const [visible, setVisible] = React.useState(true);
  const [featured, setFeatured] = React.useState(false);
  const [urlValue, setUrlValue] = React.useState('');
  const [iconValue, setIconValue] = React.useState('');
  const [titleValue, setTitleValue] = React.useState('');
  const [descValue, setDescValue] = React.useState('');
  const [iconOpen, setIconOpen] = React.useState(false);

  const previewIcon = iconValue.trim() || faviconOf(urlValue);

  const filtered = filter === 'all' ? links : links.filter((l) => l.categoryId === filter);

  function openNew() {
    if (categories.length === 0) {
      push('请先创建至少一个分类', 'error');
      return;
    }
    setEditing(null);
    setVisible(true);
    setFeatured(false);
    setUrlValue('');
    setIconValue('');
    setTitleValue('');
    setDescValue('');
    setIconOpen(false);
    setError('');
    setOpen(true);
  }

  function openEdit(row: LinkRow) {
    setEditing(row);
    setVisible(row.isVisible);
    setFeatured(row.isFeatured);
    setUrlValue(row.url);
    setIconValue(row.iconUrl ?? '');
    setTitleValue(row.title);
    setDescValue(row.description ?? '');
    // 只有图标与自动推导结果不同时才展开「自定义图标」，避免默认占位
    setIconOpen(Boolean(row.iconUrl && row.iconUrl !== faviconOf(row.url)));
    setError('');
    setOpen(true);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (editing) formData.set('id', editing.id);
    formData.set('isVisible', String(visible));
    formData.set('isFeatured', String(featured));
    // 未手动填写图标时，用站点 favicon 兜底（避免前台只剩首字母）
    formData.set('iconUrl', iconValue.trim() || faviconOf(urlValue));
    setError('');

    startTransition(async () => {
      const result = await saveLinkAction(formData);
      if (result.ok) {
        setOpen(false);
        push(result.message ?? '已保存');
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">链接管理</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">共 {links.length} 个链接</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          新建链接
        </Button>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[12px] transition',
            filter === 'all' ? 'bg-brand text-brand-ink' : 'border border-border bg-surface text-ink-soft hover:bg-surface-2',
          )}
        >
          全部 {links.length}
        </button>
        {categories.map((c) => {
          const count = links.filter((l) => l.categoryId === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[12px] transition',
                filter === c.id ? 'bg-brand text-brand-ink' : 'border border-border bg-surface text-ink-soft hover:bg-surface-2',
              )}
            >
              {c.name} {count}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          <p className="text-[13px] font-medium text-ink">没有链接</p>
          <p className="mt-1 text-[11.5px] text-muted">点击右上角「新建链接」添加第一个站点。</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <ul className="divide-y divide-border">
            {filtered.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3.5 py-2.5 transition hover:bg-surface-2/40"
              >
                <SiteIcon src={row.iconUrl} url={row.url} title={row.title} size="xs" />

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-ink">
                    <span className="truncate">{row.title}</span>
                    <Badge>{row.categoryName}</Badge>
                    {row.isFeatured && <Badge tone="brand">精选</Badge>}
                    {!row.isVisible && <Badge tone="warn">隐藏</Badge>}
                  </p>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block truncate text-[11px] text-muted transition hover:text-brand"
                  >
                    {hostOf(row.url)}
                  </a>
                </div>

                <span className="hidden shrink-0 text-[11px] tabular-nums text-muted sm:block">{row.clickCount} 次</span>

                <div className="flex w-full items-center justify-between gap-0.5 whitespace-nowrap sm:w-auto sm:justify-start">
                  <span className="text-[11px] tabular-nums text-muted sm:hidden">{row.clickCount} 次</span>
                  <AsyncButton
                    action={() => moveLinkAction(row.id, 'up')}
                    className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
                    title="上移"
                    ariaLabel="上移"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </AsyncButton>
                  <AsyncButton
                    action={() => moveLinkAction(row.id, 'down')}
                    className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
                    title="下移"
                    ariaLabel="下移"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </AsyncButton>
                  <AsyncButton
                    action={() => toggleLinkAction(row.id, { isFeatured: !row.isFeatured })}
                    className={cn(
                      'rounded-lg p-2 transition hover:bg-surface-2',
                      row.isFeatured ? 'text-amber-500' : 'text-muted hover:text-ink',
                    )}
                    title={row.isFeatured ? '取消精选' : '设为精选'}
                    ariaLabel="切换精选"
                  >
                    <Star className="h-4 w-4" filled={row.isFeatured} />
                  </AsyncButton>
                  <AsyncButton
                    action={() => toggleLinkAction(row.id, { isVisible: !row.isVisible })}
                    className={cn(
                      'rounded-lg p-2 transition hover:bg-surface-2',
                      row.isVisible ? 'text-ink-soft hover:text-ink' : 'text-muted/60 hover:text-ink',
                    )}
                    title={row.isVisible ? '当前显示，点击隐藏' : '当前隐藏，点击显示'}
                    ariaLabel="切换显示"
                  >
                    {row.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </AsyncButton>
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    aria-label="编辑"
                    title="编辑"
                    className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <AsyncButton
                    action={() => deleteLinkAction(row.id)}
                    confirm={`确定删除链接「${row.title}」？`}
                    className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                    title="删除"
                    ariaLabel="删除"
                  >
                    <Trash className="h-4 w-4" />
                  </AsyncButton>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? '编辑链接' : '新建链接'}
        description="链接会出现在首页对应分类中"
        footer={
          <>
            <Button variant="outline" className="min-w-[76px] max-sm:h-10" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="link-form" disabled={pending} className="min-w-[76px] max-sm:h-10">
              {pending ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <form id="link-form" onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2.5">
            <Field label="所属分类" htmlFor="categoryId" required>
              <Select id="categoryId" name="categoryId" defaultValue={editing?.categoryId ?? categories[0]?.id} required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="排序值" htmlFor="sortOrder" inlineHint="越小越前">
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={editing?.sortOrder ?? ''}
                placeholder="10"
                className="tabular-nums"
              />
            </Field>
          </div>

          <Field label="标题" htmlFor="title" required inlineHint={`${titleValue.length}/60`}>
            <Input
              id="title"
              name="title"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              required
              maxLength={60}
              placeholder="GitHub"
            />
          </Field>

          <Field label="链接地址" htmlFor="url" required inlineHint="https:// 可省略">
            <div className="relative">
              <IconPreview src={previewIcon} url={urlValue} title={titleValue} />
              <Input
                id="url"
                name="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                required
                placeholder="github.com"
                className="pl-10 font-mono text-[13px]"
              />
            </div>
          </Field>

          <Field label="描述" htmlFor="description" inlineHint={`${descValue.length}/200`}>
            <Textarea
              id="description"
              name="description"
              rows={2}
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              maxLength={200}
              placeholder="一句话说明这个站点"
            />
          </Field>

          <div>
            <button
              type="button"
              onClick={() => setIconOpen((v) => !v)}
              aria-expanded={iconOpen}
              className="group flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left text-ink-soft transition hover:text-ink"
            >
              <span className="truncate text-[12px]">
                自定义图标
                <span className="ml-1 text-[11px] text-muted">默认取站点 favicon</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 text-muted transition-transform',
                  iconOpen && 'rotate-180',
                )}
              />
            </button>
            {iconOpen && (
              <div className="mt-1.5 flex gap-2 rounded-xl border border-border bg-surface-2/40 p-2">
                <Input
                  id="iconUrl"
                  value={iconValue}
                  onChange={(e) => setIconValue(e.target.value)}
                  placeholder="https://…/icon.png"
                  className="font-mono text-[12px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto shrink-0 self-stretch px-3 text-[12.5px]"
                  onClick={() => setIconValue(faviconOf(urlValue))}
                >
                  取 favicon
                </Button>
              </div>
            )}
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted">展示</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Switch checked={visible} onChange={setVisible} label="前台显示" id="link-visible" />
            <Switch checked={featured} onChange={setFeatured} label="标记为精选" id="link-featured" />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-[11.5px] text-danger">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
