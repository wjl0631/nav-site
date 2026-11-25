import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from '@/components/ui/icons';

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  const item = 'grid h-8 min-w-8 place-items-center rounded-lg px-2.5 text-[13px] transition';

  return (
    <nav className="mt-7 flex items-center justify-center gap-1" aria-label="分页">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={cn(item, 'border border-border bg-surface text-ink-soft hover:bg-surface-2', page <= 1 && 'pointer-events-none opacity-40')}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Link>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              item,
              p === page
                ? 'bg-brand font-medium text-brand-ink'
                : 'border border-border bg-surface text-ink-soft hover:bg-surface-2',
            )}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={cn(item, 'border border-border bg-surface text-ink-soft hover:bg-surface-2', page >= totalPages && 'pointer-events-none opacity-40')}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </nav>
  );
}
