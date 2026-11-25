'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { categorySchema } from '@/lib/validators';
import { safeSlug } from '@/lib/utils';
import { formToObject, zodMessage, type ActionResult } from '@/lib/result';

function ping() {
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/categories');
  revalidatePath('/admin/links');
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base;
  let n = 1;
  while (n < 50) {
    const found = await prisma.category.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    slug = `${base}-${++n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function saveCategoryAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw = formToObject(formData);
  const id = raw.id || undefined;
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };

  const data = parsed.data;
  const slug = await uniqueSlug(safeSlug(data.slug ?? data.name, 'category'), id);

  try {
    if (id) {
      const updated = await prisma.category.update({
        where: { id },
        data: {
          name: data.name,
          slug,
          icon: data.icon ?? null,
          description: data.description ?? null,
          sortOrder: data.sortOrder,
          isVisible: data.isVisible,
        },
      });
      ping();
      return { ok: true, id: updated.id, slug: updated.slug, message: '分类已保存' };
    }

    const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        icon: data.icon ?? null,
        description: data.description ?? null,
        sortOrder: data.sortOrder || (max._max.sortOrder ?? 0) + 10,
        isVisible: data.isVisible,
      },
    });
    ping();
    return { ok: true, id: created.id, slug: created.slug, message: '分类已创建' };
  } catch {
    return { ok: false, error: '保存失败，请检查分类名称是否重复' };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.category.delete({ where: { id } });
    ping();
    return { ok: true, message: '分类及其链接已删除' };
  } catch {
    return { ok: false, error: '删除失败，分类可能已不存在' };
  }
}

export async function toggleCategoryAction(id: string, isVisible: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.category.update({ where: { id }, data: { isVisible } });
  ping();
  return { ok: true };
}

/** 上下移动排序：与相邻分类交换 sortOrder */
export async function moveCategoryAction(id: string, direction: 'up' | 'down'): Promise<ActionResult> {
  await requireAdmin();
  const list = await prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  const index = list.findIndex((c) => c.id === id);
  if (index === -1) return { ok: false, error: '分类不存在' };

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return { ok: true };

  const current = list[index];
  const neighbor = list[target];
  const [a, b] = [current.sortOrder, neighbor.sortOrder];

  await prisma.$transaction([
    prisma.category.update({ where: { id: current.id }, data: { sortOrder: b === a ? a + (direction === 'up' ? -1 : 1) : b } }),
    prisma.category.update({ where: { id: neighbor.id }, data: { sortOrder: a === b ? b + (direction === 'up' ? 1 : -1) : a } }),
  ]);

  ping();
  return { ok: true };
}
