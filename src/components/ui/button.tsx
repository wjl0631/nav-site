import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 ' +
  'disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:opacity-90 shadow-sm',
  secondary: 'bg-surface-2 text-ink hover:bg-border/60',
  outline: 'border border-border bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink-soft hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[12.5px]',
  md: 'h-9 px-3.5 text-[13px]',
  lg: 'h-10 px-4 text-[14px]',
  icon: 'h-8 w-8',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />;
});
