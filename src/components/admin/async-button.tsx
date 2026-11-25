'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/lib/result';
import { useToast } from './toast';

/**
 * 通用行内动作按钮：自动处理 pending、确认弹窗、Toast 提示与路由刷新
 */
export function AsyncButton({
  action,
  children,
  className,
  confirm,
  title,
  ariaLabel,
  onSuccess,
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  title?: string;
  ariaLabel?: string;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  const { push } = useToast();

  function run() {
    if (confirm && !window.confirm(confirm)) return;
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (result.message) push(result.message, 'success');
        onSuccess?.();
        router.refresh();
      } else {
        push(result.error, 'error');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      title={title}
      aria-label={ariaLabel}
      className={cn('disabled:opacity-50', className)}
    >
      {children}
    </button>
  );
}
