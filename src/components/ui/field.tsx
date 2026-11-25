'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-ink shadow-sm ' +
  'placeholder:text-muted transition outline-none focus:border-brand focus:ring-4 focus:ring-ring ' +
  'dark:bg-surface-2 dark:shadow-none ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export function Field({
  label,
  htmlFor,
  hint,
  inlineHint,
  error,
  required,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  /** 与标签同行的右侧小字，用于替代独占一行的说明，节省纵向空间 */
  inlineHint?: React.ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-[12.5px] font-medium text-ink-soft">
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
          {inlineHint && (
            <span className="shrink-0 text-[11px] font-normal tabular-nums text-muted">{inlineHint}</span>
          )}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(control, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(control, 'resize-y leading-relaxed', className)} {...props} />;
});

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(control, 'cursor-pointer pr-8', className)} {...props}>
        {children}
      </select>
    );
  },
);

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 dark:bg-surface-2">
      <span className="text-[12.5px] text-ink-soft" id={id ? `${id}-label` : undefined}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id ? `${id}-label` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}
