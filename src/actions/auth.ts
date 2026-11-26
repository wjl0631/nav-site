'use server';

import { AuthError, CredentialsSignin } from 'next-auth';
import { signIn, signOut } from '@/lib/auth';
import { RATE_WINDOW_MINUTES } from '@/lib/login-audit';
import type { ActionResult } from '@/lib/result';

export async function loginAction(formData: FormData): Promise<ActionResult> {
  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
      redirectTo: '/admin',
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === 'rate_limited') {
      return {
        ok: false,
        error: `登录尝试过于频繁，请 ${RATE_WINDOW_MINUTES} 分钟后再试`,
      };
    }
    if (error instanceof AuthError) {
      return { ok: false, error: '邮箱或密码不正确，请重试' };
    }
    // NEXT_REDIRECT 等控制流异常必须继续抛出
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/admin/login' });
}
