import { cn } from '@/lib/utils';

const tones = {
  neutral: 'bg-surface-2 text-muted',
  brand: 'bg-brand-soft text-brand',
  success: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  warn: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  danger: 'bg-danger/10 text-danger',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
