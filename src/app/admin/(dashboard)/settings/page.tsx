import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import { PasswordForm } from '@/components/admin/password-form';
import { Badge } from '@/components/admin/badge';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.adminUser.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
      })
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold text-ink">账号设置</h2>
        <p className="mt-0.5 text-xs text-muted">管理登录账号与密码</p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-3.5 shadow-[var(--shadow-card)]">
        <h3 className="text-[13.5px] font-semibold text-ink">当前账号</h3>
        <dl className="mt-2.5 grid gap-2.5 text-[12.5px] sm:grid-cols-2">
          <div>
            <dt className="text-[11px] text-muted">邮箱</dt>
            <dd className="mt-0.5 truncate text-ink">{user?.email ?? session?.user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">角色</dt>
            <dd className="mt-0.5">
              <Badge tone="brand">{user?.role ?? 'OWNER'}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">上次登录</dt>
            <dd className="mt-0.5 text-ink-soft">{formatDateTime(user?.lastLoginAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted">创建时间</dt>
            <dd className="mt-0.5 text-ink-soft">{formatDateTime(user?.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-surface p-3.5 shadow-[var(--shadow-card)]">
        <h3 className="text-[13.5px] font-semibold text-ink">修改密码</h3>
        <p className="mt-0.5 mb-4 text-[11px] text-muted">修改后请使用新密码重新登录其他设备</p>
        <PasswordForm />
      </section>

      <section className="rounded-xl border border-border bg-surface p-3.5 text-[11.5px] leading-relaxed text-muted shadow-[var(--shadow-card)]">
        <h3 className="text-[13.5px] font-semibold text-ink">部署提示</h3>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            媒体上传依赖 Vercel Blob，请在项目 Storage 中创建 Blob Store 并确认环境变量{' '}
            <code className="rounded bg-surface-2 px-1">BLOB_READ_WRITE_TOKEN</code> 已注入。
          </li>
          <li>
            数据库结构变更后执行 <code className="rounded bg-surface-2 px-1">npm run db:push</code>（本地）或重新部署。
          </li>
          <li>生产环境请务必更换 AUTH_SECRET 与初始管理员密码。</li>
        </ul>
      </section>
    </div>
  );
}
