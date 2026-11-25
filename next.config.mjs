/** @type {import('next').NextConfig} */
const nextConfig = {
  // 项目未配置 ESLint，构建时跳过以免阻塞部署
  eslint: { ignoreDuringBuilds: true },
  images: {
    // 媒体托管在 Vercel Blob / 任意 CDN，这里放行 https 图源
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Prisma 与上传相关包不参与打包，直接走 Node 运行时
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'sanitize-html'],
  poweredByHeader: false,
};

export default nextConfig;
