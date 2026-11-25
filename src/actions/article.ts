'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { articleSchema } from '@/lib/validators';
import { cleanArticleHtml, htmlToText } from '@/lib/sanitize';
import { safeSlug } from '@/lib/utils';
import { formToObject, zodMessage, type ActionResult } from '@/lib/result';

function ping(slug?: string) {
  revalidatePath('/');
  revalidatePath('/articles');
  revalidatePath('/admin');
  revalidatePath('/admin/articles');
  if (slug) revalidatePath(`/articles/${slug}`);
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base;
  let n = 1;
  while (n < 50) {
    const found = await prisma.article.findUnique({ where: { slug } });
    if (!found || found.id === excludeId) return slug;
    slug = `${base}-${++n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function parseContent(json: string): Prisma.InputJsonValue {
  try {
    const value = JSON.parse(json);
    if (value && typeof value === 'object' && 'type' in value) return value as Prisma.InputJsonValue;
  } catch {
    /* ignore */
  }
  return { type: 'doc', content: [] };
}

export async function saveArticleAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdmin();
  const raw = formToObject(formData);
  const id = raw.id || undefined;

  const parsed = articleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const data = parsed.data;

  const safeHtml = cleanArticleHtml(data.contentHtml);
  const slug = await uniqueSlug(safeSlug(data.slug ?? data.title, 'article'), id);
  const summary = data.summary ?? htmlToText(safeHtml, 160) ?? null;
  const isPublished = data.status === 'PUBLISHED';

  try {
    if (id) {
      const existing = await prisma.article.findUnique({
        where: { id },
        select: { publishedAt: true, slug: true },
      });
      const updated = await prisma.article.update({
        where: { id },
        data: {
          title: data.title,
          slug,
          summary: summary || null,
          coverUrl: data.coverUrl ?? null,
          content: parseContent(data.contentJson),
          contentHtml: safeHtml,
          status: data.status,
          publishedAt: existing?.publishedAt ?? (isPublished ? new Date() : null),
          isFeatured: data.isFeatured,
          tags: data.tags,
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
        },
      });
      ping(updated.slug);
      if (existing && existing.slug !== updated.slug) {
        revalidatePath(`/articles/${existing.slug}`);
      }
      return { ok: true, id: updated.id, slug: updated.slug, message: isPublished ? '文章已更新' : '草稿已保存' };
    }

    const created = await prisma.article.create({
      data: {
        title: data.title,
        slug,
        summary: summary || null,
        coverUrl: data.coverUrl ?? null,
        content: parseContent(data.contentJson),
        contentHtml: safeHtml,
        status: data.status,
        publishedAt: isPublished ? new Date() : null,
        isFeatured: data.isFeatured,
        tags: data.tags,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        authorId: user.id,
      },
    });
    ping(created.slug);
    return { ok: true, id: created.id, slug: created.slug, message: isPublished ? '文章已发布' : '草稿已保存' };
  } catch (error) {
    console.error('saveArticleAction failed', error);
    return { ok: false, error: '保存失败，请稍后重试' };
  }
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const removed = await prisma.article.delete({ where: { id } });
    revalidatePath(`/articles/${removed.slug}`);
    ping();
    return { ok: true, message: '文章已删除' };
  } catch {
    return { ok: false, error: '删除失败，文章可能已不存在' };
  }
}

export async function updateArticleFlagsAction(
  id: string,
  patch: { status?: 'DRAFT' | 'PUBLISHED'; isFeatured?: boolean },
): Promise<ActionResult> {
  await requireAdmin();
  const current = await prisma.article.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!current) return { ok: false, error: '文章不存在' };

  const updated = await prisma.article.update({
    where: { id },
    data: {
      ...patch,
      publishedAt:
        patch.status === 'PUBLISHED' && !current.publishedAt ? new Date() : undefined,
    },
  });
  ping(updated.slug);
  return { ok: true };
}
