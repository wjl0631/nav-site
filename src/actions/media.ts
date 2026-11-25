'use server';

import { revalidatePath } from 'next/cache';
import { del } from '@vercel/blob';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { mediaSchema } from '@/lib/validators';
import type { ActionResult } from '@/lib/result';

export async function saveMediaAction(input: {
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}): Promise<ActionResult> {
  await requireAdmin();
  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: '媒体信息不合法' };

  const created = await prisma.media.create({ data: parsed.data });
  revalidatePath('/admin/media');
  return { ok: true, id: created.id };
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const record = await prisma.media.delete({ where: { id } });
    if (process.env.BLOB_READ_WRITE_TOKEN && record.url.includes('blob.vercel-storage.com')) {
      await del(record.url).catch(() => undefined);
    }
    revalidatePath('/admin/media');
    return { ok: true, message: '媒体已删除' };
  } catch {
    return { ok: false, error: '删除失败，媒体可能已不存在' };
  }
}
