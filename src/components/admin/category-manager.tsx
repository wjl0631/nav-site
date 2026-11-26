'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
  toggleCategoryAction,
} from '@/actions/category';
import { Button } from '@/components/ui/button';
import { Field, Input, Switch, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { CategoryGlyph } from '@/components/ui/category-glyph';
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Plus, Trash } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { AsyncButton } from './async-button';
import { useToast } from './toast';

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  isVisible: boolean;
  linkCount: number;
};

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryRow | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');
  const [visible, setVisible] = React.useState(true);
  /** 图标字段受控，用于输入时实时预览 emoji 与 SVG 的最终效果 */
  const [iconValue, setIconValue] = React.useState('');

  function openNew() {
    setEditing(null);
    setVisible(true);
    setIconValue('');
    setError('');
    setOpen(true);
  }

  function openEdit(row: CategoryRow) {
    setEditing(row);
    setVisible(row.isVisible);
    setIconValue(row.icon ?? '');
    setError('');
    setOpen(true);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (editing) formData.set('id', editing.id);
    formData.set('isVisible', String(visible));
    setError('');

    startTransition(async () => {
      const result = await saveCategoryAction(formData);
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
          <h2 className="text-[16px] font-semibold text-ink">分类管理</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">共 {categories.length} 个分类，排序值越小越靠前</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          新建分类
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
          <p className="text-sm font-medium text-ink">还没有分类</p>
          <p className="mt-1 text-xs text-muted">先创建一个分类，再往里添加链接。</p>
          <Button className="mt-4" onClick={openNew}>
            新建分类
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-card)]">
          <div className="hidden border-b border-border bg-surface-2/60 px-3.5 py-2 text-[11px] font-medium text-muted sm:grid sm:grid-cols-[1fr_80px_76px_190px] sm:gap-3">
            <span>分类</span>
            <span className="text-center">链接数</span>
            <span className="text-center">状态</span>
            <span className="text-right">操作</span>
          </div>

          <ul className="divide-y divide-border">
            {categories.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 transition hover:bg-surface-2/40 sm:grid sm:grid-cols-[1fr_80px_76px_190px]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2 text-[15px]">
                    <CategoryGlyph
                      icon={row.icon}
                      name={row.name}
                      imgClassName="h-full w-full object-contain p-[3px]"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink">
                      {row.name}
                      <span className="font-mono text-[10px] font-normal text-muted">/{row.slug}</span>
                    </p>
                    {row.description && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">{row.description}</p>
                    )}
                  </div>
                </div>

                <div className="hidden text-center text-[13px] tabular-nums text-ink-soft sm:block">
                  {row.linkCount}
                </div>

                <div className="hidden justify-center sm:flex">
                  <Badge tone={row.isVisible ? 'success' : 'neutral'}>{row.isVisible ? '显示' : '隐藏'}</Badge>
                </div>

                <div className="flex items-center justify-end gap-0.5 whitespace-nowrap">
                  <AsyncButton
                    action={() => moveCategoryAction(row.id, 'up')}
                    className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
                    title="上移"
                    ariaLabel="上移"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </AsyncButton>
                  <AsyncButton
                    action={() => moveCategoryAction(row.id, 'down')}
                    className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
                    title="下移"
                    ariaLabel="下移"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </AsyncButton>
                  <AsyncButton
                    action={() => toggleCategoryAction(row.id, !row.isVisible)}
                    className={cn(
                      'rounded-lg p-2 transition hover:bg-surface-2',
                      row.isVisible ? 'text-ink-soft hover:text-ink' : 'text-muted/60 hover:text-ink',
                    )}
                    title={row.isVisible ? '当前显示，点击隐藏' : '当前隐藏，点击显示'}
                    ariaLabel={row.isVisible ? '隐藏分类' : '显示分类'}
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
                    action={() => deleteCategoryAction(row.id)}
                    confirm={`确定删除分类「${row.name}」？该分类下 ${row.linkCount} 个链接会一并删除。`}
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
        title={editing ? '编辑分类' : '新建分类'}
        description="分类用于首页分组展示，slug 会出现在锚点与链接中"
        footer={
          <>
            <Button variant="outline" className="min-w-[76px] max-sm:h-10" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="category-form" disabled={pending} className="min-w-[76px] max-sm:h-10">
              {pending ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={onSubmit} className="flex flex-col gap-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="名称" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={editing?.name} required maxLength={40} placeholder="开发工具" />
            </Field>
            <Field label="图标" htmlFor="icon">
              <div className="relative">
                {iconValue.trim() && (
                  <span className="pointer-events-none absolute left-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center overflow-hidden text-[13px]">
                    <CategoryGlyph
                      icon={iconValue}
                      name=" "
                      imgClassName="h-full w-full object-contain"
                    />
                  </span>
                )}
                <Input
                  id="icon"
                  name="icon"
                  value={iconValue}
                  onChange={(event) => setIconValue(event.target.value)}
                  maxLength={300}
                  placeholder="🛠 或 https://…/icon.svg"
                  className="pl-9"
                />
              </div>
            </Field>
          </div>

          <Field label="Slug" htmlFor="slug" hint="留空自动根据名称生成，需唯一">
            <Input
              id="slug"
              name="slug"
              defaultValue={editing?.slug ?? ''}
              maxLength={60}
              placeholder="dev-tools"
              className="font-mono text-[13px]"
            />
          </Field>

          <Field label="描述" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={editing?.description ?? ''}
              maxLength={200}
              placeholder="一句话说明这个分类收录什么"
            />
          </Field>

          <Field label="排序值" htmlFor="sortOrder" hint="数字越小越靠前，留空自动排到末尾">
            <Input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={editing?.sortOrder ?? ''}
              placeholder="10"
            />
          </Field>

          <Switch checked={visible} onChange={setVisible} label="在前台显示该分类" id="cat-visible" />

          {error && (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}
        </form>
      </Modal>
    </div>
  );
}
