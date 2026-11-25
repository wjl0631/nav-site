import { ArticleForm } from '@/components/admin/article-form';

export const dynamic = 'force-dynamic';

export default function NewArticlePage() {
  return (
    <ArticleForm
      initial={{
        title: '',
        slug: '',
        summary: '',
        coverUrl: '',
        content: null,
        contentHtml: '',
        status: 'DRAFT',
        isFeatured: false,
        tags: '',
        seoTitle: '',
        seoDescription: '',
      }}
    />
  );
}
