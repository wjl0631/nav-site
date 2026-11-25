import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { LoginForm } from '@/components/admin/login-form';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { BrandMark } from '@/components/ui/brand-mark';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || '浮生若梦';

export const metadata: Metadata = {
  title: '后台登录',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/admin');

  return (
    <div className="relative grid min-h-dvh place-items-center bg-canvas px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[380px]">
        {/* 左侧站名、右侧 logo：logo 尖端悬在卡片上沿，是贴着而不是压住 */}
        <div className="flex items-end justify-between gap-3">
          <p className="-translate-y-2.5 translate-x-5 font-serif text-[24px] leading-none tracking-[0.14em] text-ink-soft">
            {SITE_NAME}
          </p>
          <BrandMark className="h-12 w-12 -mb-px" />
        </div>
        <h1 className="sr-only">登录 {SITE_NAME} 后台</h1>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
