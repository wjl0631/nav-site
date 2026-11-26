import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from './db';
import { clientIpOf, recordLogin, type LoginFailReason } from './login-audit';
import { loginSchema } from './validators';

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
        const audit = (email: string, success: boolean, reason?: LoginFailReason) =>
          recordLogin({ email, success, reason, ip, userAgent });

        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) {
          await audit(typeof raw?.email === 'string' ? raw.email : '', false, 'INVALID_INPUT');
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
