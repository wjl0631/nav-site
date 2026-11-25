'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { linkSchema } from '@/lib/validators';
import { normalizeUrl } from '@/lib/utils';
import { formToObject, zodMessage, type ActionResult } from '@/lib/result';

function ping() {
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/links');
}

export async function saveLinkAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw = formToObject(formData);
  const id = raw.id || undefined;
  const normalized = { ...raw, url: normalizeUrl(raw.url ?? '') };

  const parsed = linkSchema.safeParse(normalized);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const data = parsed.data;

  try {
    if (id) {
      const updated = await prisma.link.update({
        where: { id },
        data: {
          categoryId: data.categoryId,
          title: data.title,
          url: data.url,
          description: data.description ?? null,
          iconUrl: data.iconUrl ?? null,
          sortOrder: data.sortOrder,
          isVisible: data.isVisible,
          isFeatured: data.isFeatured,
        },
      });
      ping();
      return { ok: true, id: updated.id, message: '链接已保存' };
    }

    const max = await prisma.link.aggregate({
      where: { categoryId: data.categoryId },
      _max: { sortOrder: true },
    });
    const created = await prisma.link.create({
      data: {
        categoryId: data.categoryId,
        title: data.title,
        url: data.url,
        description: data.description ?? null,
        iconUrl: data.iconUrl ?? null,
        sortOrder: data.sortOrder || (max._max.sortOrder ?? 0) + 10,
        isVisible: data.isVisible,
        isFeatured: data.isFeatured,
      },
    });
    ping();
    return { ok: true, id: created.id, message: '链接已创建' };
  } catch {
    return { ok: false, error: '保存失败，请检查分类是否存在' };
  }
}

export async function deleteLinkAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.link.delete({ where: { id } });
    ping();
    return { ok: true, message: '链接已删除' };
  } catch {
    return { ok: false, error: '删除失败，链接可能已不存在' };
  }
}

export async function toggleLinkAction(
  id: string,
  patch: { isVisible?: boolean; isFeatured?: boolean },
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.link.update({ where: { id }, data: patch });
  ping();
  return { ok: true };
}

export async function moveLinkAction(id: string, direction: 'up' | 'down'): Promise<ActionResult> {
  await requireAdmin();
  const current = await prisma.link.findUnique({ where: { id } });
  if (!current) return { ok: false, error: '链接不存在' };

  const list = await prisma.link.findMany({
    where: { categoryId: current.categoryId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const index = list.findIndex((l) => l.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return { ok: true };

  const neighbor = list[target];
  await prisma.$transaction([
    prisma.link.update({
      where: { id: current.id },
      data: { sortOrder: neighbor.sortOrder === current.sortOrder ? current.sortOrder + (direction === 'up' ? -1 : 1) : neighbor.sortOrder },
    }),
    prisma.link.update({
      where: { id: neighbor.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  ping();
  return { ok: true };
}
