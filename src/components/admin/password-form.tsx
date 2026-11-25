'use client';

import * as React from 'react';
import { changePasswordAction } from '@/actions/account';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useToast } from './toast';

export function PasswordForm() {
  const { push } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError('');
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (result.ok) {
        formRef.current?.reset();
        push(result.message ?? '密码已更新');
      } else {
        setError(result.error);
        push(result.error, 'error');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <Field label="当前密码" htmlFor="currentPassword" required>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="新密码" htmlFor="newPassword" hint="至少 8 位" required>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Field label="确认新密码" htmlFor="confirmPassword" required>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? '更新中…' : '更新密码'}
      </Button>
    </form>
  );
}
