import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** 带点击统计的跳转：/api/go/[id] */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const link = await prisma.link.findUnique({ where: { id } }).catch(() => null);

  if (!link || !link.isVisible) {
    redirect('/');
  }

  await prisma.link
    .update({ where: { id }, data: { clickCount: { increment: 1 } } })
    .catch(() => undefined);

  redirect(link.url);
}
