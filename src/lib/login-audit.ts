import { createHash } from 'node:crypto';
import { prisma } from './db';

/** 登录失败原因，与 LoginLog.reason 对应 */
export type LoginFailReason = 'INVALID_INPUT' | 'USER_NOT_FOUND' | 'BAD_PASSWORD';

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
