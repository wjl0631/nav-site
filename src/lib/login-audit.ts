import { createHash } from 'node:crypto';
import { prisma } from './db';

/** 登录失败原因，与 LoginLog.reason 对应 */
export type LoginFailReason =
  | 'INVALID_INPUT'
  | 'USER_NOT_FOUND'
  | 'BAD_PASSWORD'
  /** 触发限流被直接拒绝（不计入失败次数，避免持续攻击无限延长封禁） */
  | 'RATE_LIMITED';

/** 限流窗口（分钟）与窗口内允许的失败次数 */
export const RATE_WINDOW_MINUTES = 10;
export const RATE_MAX_FAILURES = 5;

/** 计入限流的失败原因。RATE_LIMITED 刻意排除在外 */
const COUNTED_REASONS: LoginFailReason[] = ['INVALID_INPUT', 'USER_NOT_FOUND', 'BAD_PASSWORD'];

/** 取真实客户端 IP：Vercel 与常见反代都把原始 IP 放在 x-forwarded-for 首位 */
export function clientIpOf(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || null;
}

/**
 * IP 加盐哈希。
 * 原始 IP 属于个人信息，长期留存需要告知与删除机制；这里只保留 16 位摘要，
 * 足够判断「是否同一来源」，无法反推地址。
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.AUTH_SECRET || 'nav-login-audit';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 16);
}

/**
 * 判断是否应当拒绝本次登录尝试。
 * 同时按「邮箱」和「来源 IP 哈希」两个维度统计，任一维度达到阈值即拒绝：
 * 前者防止针对单一账号的密码猜测，后者防止换着邮箱撞库。
 *
 * 数据库异常时放行（fail-open）——限流是旁路保护，
 * 不应因为统计查询失败把正常登录也一起锁死。
 */
export async function isRateLimited(
  email: string,
  ipHash: string | null,
): Promise<{ limited: boolean; byEmail: number; byIp: number }> {
  try {
    const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000);
    const base = {
      success: false,
      reason: { in: COUNTED_REASONS },
      createdAt: { gte: since },
    } as const;

    const [byEmail, byIp] = await Promise.all([
      email
        ? prisma.loginLog.count({ where: { ...base, email } })
        : Promise.resolve(0),
      ipHash
        ? prisma.loginLog.count({ where: { ...base, ipHash } })
        : Promise.resolve(0),
    ]);

    return {
      limited: byEmail >= RATE_MAX_FAILURES || byIp >= RATE_MAX_FAILURES,
      byEmail,
      byIp,
    };
  } catch {
    return { limited: false, byEmail: 0, byIp: 0 };
  }
}

/**
 * 写入一条登录审计。
 * 审计属于旁路逻辑，任何异常都必须吞掉——不能因为记日志失败而让登录流程崩溃。
 */
export async function recordLogin(input: {
  email: string;
  success: boolean;
  reason?: LoginFailReason;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.loginLog.create({
      data: {
        email: (input.email || '—').slice(0, 160),
        success: input.success,
        reason: input.reason ?? null,
        ipHash: hashIp(input.ip ?? null),
        userAgent: input.userAgent?.slice(0, 200) ?? null,
      },
    });
  } catch {
    // 忽略：审计不影响鉴权结果
  }
}
