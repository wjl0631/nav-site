import type { NextAuthConfig } from 'next-auth';

/**
 * 与 Node 运行时无关的基础配置（middleware / Edge 可安全引入）
 * 真正的 Credentials Provider 在 src/lib/auth.ts 中挂载
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: '/admin/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = nextUrl;
      const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
      if (!isAdminArea) return true;

      if (pathname === '/admin/login') {
        if (isLoggedIn) return Response.redirect(new URL('/admin', nextUrl));
        return true;
      }
      // 未登录访问后台 → 交给 Auth.js 跳转登录页（带 callbackUrl）
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? 'OWNER';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? '';
        session.user.role = (token.role as string) ?? 'OWNER';
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
