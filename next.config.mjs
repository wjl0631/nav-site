/** @type {import('next').NextConfig} */
const nextConfig = {
  // 项目未配置 ESLint，构建时跳过以免阻塞部署
  eslint: { ignoreDuringBuilds: true },
  images: {
    // 媒体托管在 Vercel Blob / 任意 CDN，这里放行 https 图源
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Prisma 必须外部化：它要按平台加载原生查询引擎，打包会破坏路径解析。
  // bcryptjs 是纯 CJS，外部化无副作用。
  //
  // 注意：sanitize-html 曾经也在这里，已于 2026-11-26 移出，原因它不是可选项——
  // 它依赖 htmlparser2@12（"type":"module"，只提供 ESM，没有 CJS 入口），
  // 而 sanitize-html 自身是 CJS，源码里直接 require('htmlparser2')。
  // 一旦外部化，Node 就要在运行时 require 一个纯 ESM 包：
  //   require() of ES Module ... htmlparser2/dist/index.js not supported
  // 出错点恰好只在「保存文章」这个 server action 上，且本地 Node ≥22.12
  // 默认支持 require(ESM) 所以复现不了，只有 Vercel 函数会炸。
  // 让它参与打包后，htmlparser2 会被编译进 CJS 产物，不再走运行时 require。
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  poweredByHeader: false,
};

export default nextConfig;
