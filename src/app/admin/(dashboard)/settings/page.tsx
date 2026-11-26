import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import { PasswordForm } from '@/components/admin/password-form';
import { Badge } from '@/components/admin/badge';

export const dynamic = 'force-dynamic';

/** 失败原因的中文说明（仅后台可见） */
const FAIL_LABELS: Record<string, string> = {
  INVALID_INPUT: '输入无效',
  USER_NOT_FOUND: '账号不存在',
  BAD_PASSWORD: '密码错误',
};

const RECENT_LIMIT = 10;

export default async function AdminSettingsPage() {
  const session = await auth();

  const [user, logs] = await Promise.all([
    session?.user?.id
      ? prisma.adminUser.findUnique({
          where: { id: session.user.id },
          select: { email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
        })
      : Promise.resolve(null),
    prisma.loginLog
      .findMany({
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        select: { id: true, email: true, success: true, reason: true, ipHash: true, createdAt: true },
      })
      .catch(() => []),
  ]);

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

      <section className="rounded-xl border border-border bg-surface p-3.5 shadow-[var(--shadow-card)]">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13.5px] font-semibold text-ink">登录记录</h3>
          <span className="text-[11px] text-muted">最近 {logs.length} 条</span>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          成功与失败都会记录。若出现连续失败，说明有人在尝试猜测密码，建议立即更换强密码。
        </p>

        {logs.length === 0 ? (
          <p className="mt-3 text-[12px] text-muted">暂无记录</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 text-[12px]">
                <Badge tone={log.success ? 'success' : 'danger'}>
                  {log.success ? '成功' : (FAIL_LABELS[log.reason ?? ''] ?? '失败')}
                </Badge>
                <span className="max-w-[16rem] truncate text-ink">{log.email}</span>
                <span className="text-border">/</span>
                <span className="text-muted">{formatDateTime(log.createdAt)}</span>
                {log.ipHash && (
                  <>
                    <span className="text-border">/</span>
                    <code
                      className="rounded bg-surface-2 px-1 text-[11px] text-ink-soft"
                      title="来源 IP 的加盐哈希，同一来源数值相同"
                    >
                      {log.ipHash.slice(0, 8)}
                    </code>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
