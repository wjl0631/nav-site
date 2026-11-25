'use client';

import * as React from 'react';
import Link from 'next/link';
import { loginAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';

export function LoginForm() {
  const [error, setError] = React.useState('');
  const [pending, startTransition] = React.useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError('');
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="邮箱" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="admin@example.com"
          defaultValue={process.env.NODE_ENV === 'development' ? 'admin@example.com' : undefined}
        />
      </Field>

      <Field label="密码" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
        {pending ? '登录中…' : '登录后台'}
      </Button>

      <Link href="/" className="text-center text-xs text-muted transition hover:text-ink">
        ← 返回站点首页
      </Link>
    </form>
  );
}
