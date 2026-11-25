import { SiteIcon } from '@/components/ui/site-icon';
import { hostOf } from '@/lib/utils';

export type LinkCardData = {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  iconUrl?: string | null;
  isFeatured?: boolean;
};

export function LinkCard({ link }: { link: LinkCardData }) {
  return (
    <a
      href={`/api/go/${link.id}`}
      target="_blank"
      rel="noopener noreferrer"
      title={link.description ?? link.title}
      className="group relative flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg active:translate-y-0"
    >
      <SiteIcon src={link.iconUrl} url={link.url} title={link.title} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13.5px] font-semibold text-ink group-hover:text-brand">
            {link.title}
          </span>
          {link.isFeatured && (
            <span className="shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-medium text-brand">
              精选
            </span>
          )}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-muted">
          {link.description || hostOf(link.url)}
        </span>
      </span>
    </a>
  );
}
