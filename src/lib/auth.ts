import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from './db';
import {
  clientIpOf,
  hashIp,
  isRateLimited,
  recordLogin,
  type LoginFailReason,
} from './login-audit';
import { loginSchema } from './validators';

/** 触发限流时抛出，loginAction 据此给出区别于「密码错误」的提示 */
class LoginRateLimited extends CredentialsSignin {
  code = 'rate_limited';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: '管理员账号',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(raw, request) {
        const headers = request?.headers;
        const ip = headers ? clientIpOf(headers) : null;
        const userAgent = headers?.get('user-agent') ?? null;
        const ipHash = hashIp(ip);
        const audit = (email: string, success: boolean, reason?: LoginFailReason) =>
          recordLogin({ email, success, reason, ip, userAgent });

        // 先取原始邮箱做限流判断，放在格式校验之前：
        // 无效输入同样是攻击信号，不能因为它没通过校验就绕过计数。
        const submitted = typeof raw?.email === 'string' ? raw.email.trim().toLowerCase() : '';

        const rate = await isRateLimited(submitted, ipHash);
        if (rate.limited) {
          await audit(submitted, false, 'RATE_LIMITED');
          throw new LoginRateLimited();
        }

        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) {
          await audit(submitted, false, 'INVALID_INPUT');
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (!user) {
          await audit(email, false, 'USER_NOT_FOUND');
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          await audit(email, false, 'BAD_PASSWORD');
          return null;
        }

        await audit(email, true);

        await prisma.adminUser
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});

/** 服务端守卫：Server Action / Route Handler 内调用 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }
  return session.user;
}
