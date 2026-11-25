import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ArticleForm } from '@/components/admin/article-form';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <ArticleForm
      initial={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary ?? '',
        coverUrl: article.coverUrl ?? '',
        content: article.content as unknown,
        contentHtml: article.contentHtml,
        status: article.status,
        isFeatured: article.isFeatured,
        tags: article.tags.join(', '),
        seoTitle: article.seoTitle ?? '',
        seoDescription: article.seoDescription ?? '',
      }}
    />
  );
}
