# 浮生若梦 · 导航站（NAV）

站点名与 Logo 由 `NEXT_PUBLIC_SITE_NAME` 与 `src/components/ui/brand-mark.tsx` 控制。

一个可直接部署到 Vercel 的导航站系统：**前台**按分类展示导航链接、支持文章列表与详情浏览；**后台**维护分类、链接、文章与媒体资源。文章支持标题、正文、封面以及图片 / 视频 / 音频的插入与内联播放，桌面端与移动端均可正常使用。

技术栈：Next.js 15（App Router + Server Actions）· TypeScript · Tailwind CSS 4 · Prisma 6 + PostgreSQL（Neon）· Auth.js v5 · Tiptap 3 · Vercel Blob

---

## 1. 功能一览

### 前台
- 首页：无大 Banner，顶栏直接进入内容；分类分组展示链接、图标三级回退（站点 favicon → DuckDuckGo 兜底 → 首字母）、精选标记、分类快捷跳转
- 顶栏搜索：全站唯一入口，桌面端内联在导航栏、移动端点图标展开一行。首页输入即过滤已加载链接（客户端，零请求）；文章列表与详情页输入后防抖写入 `/articles?q=`，走服务端检索，详见 `src/components/site/site-header.tsx`
- 文章列表：封面卡片网格、关键词检索（标题 / 摘要 / 标签）、分页
- 文章详情：正文富文本渲染、封面图、标签、浏览量、上下篇导航、`Article` 结构化数据（SEO）
- 响应式：1 / 2 / 3 / 4 列自适应栅格，移动端横向滚动分类条
- 深色模式：顶栏一键切换（前台 / 后台 / 登录页均有入口），首屏按「localStorage 记忆 → 系统偏好」着色，刷新不闪白；同时改写 `theme-color` 让移动端地址栏跟着变
- 链接跳转走 `/api/go/[id]`，顺带累计点击量

### 后台（`/admin`）
- 登录：Auth.js Credentials + bcrypt，JWT 会话，middleware 拦截未登录访问
- 概览：分类 / 链接 / 文章 / 总点击统计，最近编辑文章与新增链接
- 分类管理：新建、编辑、删除（级联删除链接）、上下移动排序、显示 / 隐藏、链接计数
- 链接管理：按分类筛选、排序、精选 / 显示切换、favicon 自动获取（站点 `/favicon.ico` 不可达时用 `icons.duckduckgo.com` 兜底）、点击量展示
- 文章管理：草稿 / 发布分离、精选标记、封面、标签、SEO 标题与描述、删除
- 富文本编辑器：标题、加粗、斜体、下划线、删除线、列表、引用、代码块、分割线、链接，以及**图片 / 视频 / 音频上传**和**视频 / 音频外链插入**
- 媒体库：拖拽上传（图片 / 视频 / 音频，单文件上限 100MB）、类型筛选、预览、复制地址、删除（同步删除 Blob 对象）
- 账号设置：修改密码、查看上次登录时间

---

## 2. 目录结构

```
NAV/
├── prisma/
│   ├── schema.prisma           # 数据模型
│   └── seed.ts                 # 管理员 + 示例分类/链接/文章
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局（metadata / viewport / 主题色）
│   │   ├── globals.css         # 设计令牌、正文排版、编辑器样式
│   │   ├── (site)/             # 前台路由组（含 Header / Footer）
│   │   │   ├── page.tsx                 # 首页
│   │   │   └── articles/
│   │   │       ├── page.tsx             # 文章列表 + 搜索 + 分页
│   │   │       └── [slug]/page.tsx      # 文章详情
│   │   ├── admin/
│   │   │   ├── (auth)/login/page.tsx
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx           # 后台外壳 + 登录守卫
│   │   │       ├── page.tsx             # 概览
│   │   │       ├── categories/page.tsx
│   │   │       ├── links/page.tsx
│   │   │       ├── articles/{page,new,[id]/edit}.tsx
│   │   │       ├── media/page.tsx
│   │   │       └── settings/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── upload/route.ts          # Blob 直传令牌
│   │       └── go/[id]/route.ts         # 点击统计跳转
│   ├── actions/                # 服务端动作（分类/链接/文章/媒体/账号/登录）
│   ├── components/
│   │   ├── ui/                 # Button / Field / Modal / Icons
│   │   ├── site/               # Header / Footer / LinkCard / ArticleCard / 首页搜索
│   │   ├── admin/              # 后台外壳、表格、表单、Toast
│   │   └── editor/             # Tiptap 编辑器 + 视频/音频节点
│   ├── lib/                    # prisma / auth / validators / sanitize / utils / 上传客户端
│   └── middleware.ts           # /admin 路由守卫
├── next.config.mjs
├── vercel.json
└── .env.example
```

---

## 3. 快速开始（本地）

```bash
npm install

# 1) 准备一个 PostgreSQL（本地或 Neon 免费实例），把连接串写进 .env
cp .env.example .env

# 2) 建表 + 灌入示例数据
npm run db:push
npm run db:seed

# 3) 启动
npm run dev          # http://localhost:3000 ，后台 http://localhost:3000/admin
```

默认账号：`ADMIN_EMAIL` / `ADMIN_PASSWORD`（示例为 `admin@example.com` / `ChangeMe123!`）。**登录后请在「账号设置」中立即修改。**

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | 运行时连接串（Neon 使用带 `-pooler` 的地址） |
| `DIRECT_URL` | ✅ | 迁移 / `db push` 直连地址 |
| `AUTH_SECRET` | ✅ | 会话签名密钥，`openssl rand -base64 32` 生成 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 建议 | 仅 seed 使用，用于创建初始管理员 |
| `BLOB_READ_WRITE_TOKEN` | 线上必填 | 媒体存储令牌；本地留空会自动回退到 `public/uploads` 落盘 |
| `NEXT_PUBLIC_SITE_NAME` | 可选 | 站点名称（Header、metadata） |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | 可选 | 站点描述 |
| `NEXT_PUBLIC_SITE_URL` | 可选 | 站点根地址，用于 canonical / OG / JSON-LD |

**Neon 两条连接串怎么取**：控制台 → 选中项目 → 顶部 **Connect** → 勾选 "Connection pooling" 复制出带 `-pooler` 的串填 `DATABASE_URL`；取消勾选再复制一次（无 `-pooler`）填 `DIRECT_URL`。建议两条都追加 `&connect_timeout=30`，避免计算实例冷启动导致 Prisma 报 `P1001`；若报 `P1013` 连接串不合法，删掉 `channel_binding=require` 即可。

> Neon 控制台里那份 `AWS_ENDPOINT_URL_S3` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` 是**对象存储**的 S3 凭据，不是数据库地址，本项目的上传走 Vercel Blob，暂不需要它们。

---

## 4. 部署到 Vercel

> 更细的逐步操作（含环境变量生成、线上库初始化命令、验收清单、排错表）见 **[DEPLOY.md](./DEPLOY.md)**。

1. **创建数据库**：Vercel → Storage → Postgres（Neon），或直接在 [neon.tech](https://neon.tech) 建库；复制 pooled 与 direct 两条连接串。
2. **创建 Blob**：Vercel 项目 → Storage → Blob，创建后 `BLOB_READ_WRITE_TOKEN` 会自动注入到项目环境变量。
3. **导入仓库**：Vercel → New Project → 选择本仓库，Framework 会被识别为 Next.js（`vercel.json` 已声明 region 与安全响应头）。
4. **配置环境变量**：把上表中所有必填项填入 Production / Preview。
5. **初始化数据库**（本地执行一次，指向线上库）：
   ```bash
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npx prisma db push
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npm run db:seed
   ```
6. **Deploy**，然后访问 `https://<your-domain>/admin` 登录。

> 说明：`buildCommand` 为 `npm run build`，其中已包含 `prisma generate`，因此 Vercel 构建阶段无需连接数据库；页面均声明为动态渲染（`force-dynamic`），不会再构建期查询数据。

**媒体上传的三种模式**：
| 条件 | 行为 |
| --- | --- |
| 配置了 `BLOB_READ_WRITE_TOKEN` | 浏览器直传 Vercel Blob，返回公网 URL（线上推荐，支持大文件） |
| 未配置 + `npm run dev` | 回退到 `/api/upload/local`，文件写入 `public/uploads/`，可在本地正常预览 |
| 未配置 + 生产构建 | 上传直接报错并提示配置 Blob —— 因为 Vercel 的 `public/` 是构建产物，运行时写入的文件不会被托管 |

---

## 5. 数据模型

| 模型 | 关键字段 | 说明 |
| --- | --- | --- |
| `AdminUser` | email、passwordHash、role、lastLoginAt | 后台账号，`role` 预留多角色扩展 |
| `Category` | name、slug(唯一)、icon、description、sortOrder、isVisible | 导航分类 |
| `Link` | categoryId、title、url、iconUrl、sortOrder、isVisible、isFeatured、clickCount | 导航链接，删除分类时级联删除 |
| `Article` | title、slug、summary、coverUrl、`content`(JSON)、`contentHtml`、status、publishedAt、viewCount、tags、seo* | 正文 JSON 为唯一数据源，HTML 为渲染缓存 |
| `Media` | url、type(IMAGE/VIDEO/AUDIO)、filename、mimeType、size | 媒体库索引，文件本体在 Vercel Blob |

**为什么同时存 `content` 和 `contentHtml`**：JSON 用于回填编辑器，HTML 由服务端清洗后直出，前台无需加载 Tiptap 运行时；写入时经 `sanitize-html` 白名单过滤（放行 `video` / `audio` / `source` / 白名单 iframe），杜绝存储型 XSS。

---

## 6. 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地开发 |
| `npm run build` | `prisma generate` + 生产构建 |
| `npm run db:push` | 同步 schema 到数据库（开发期最快） |
| `npm run db:seed` | 写入管理员与示例数据（幂等） |
| `npm run db:studio` | Prisma Studio 可视化查看数据 |
| `npm run setup` | `db:push` + `db:seed` 一条命令初始化 |

如需版本化迁移，改用 `npx prisma migrate dev --name init` 并把 `prisma migrate deploy` 加入构建命令。

---

## 7. 常见问题

**上传报 “未登录” / 400 / “未配置媒体存储”**
上传前会校验会话，请确认已登录后台。若提示未配置存储：线上需在 Vercel 项目 Storage 中创建 Blob Store（`BLOB_READ_WRITE_TOKEN` 会自动注入）；本地开发无需配置，会自动写入 `public/uploads/`。

**偶发 500 / `P1001 Can't reach database server`**
Neon 计算实例会 scale-to-zero，冷启动唤醒需要几秒。项目已做两层处理：连接串建议带 `connect_timeout=30`，同时 `src/lib/db.ts` 对 P1001 做了一次自动重试。若仍频繁出现，可在 Neon 控制台把 Auto-suspend 延迟调长。

**大文件上传**
Blob 模式下走浏览器直传（`@vercel/blob/client`），不经过 Serverless 4.5MB 请求体限制，单文件上限由 `src/app/api/upload/route.ts` 中的 `MAX_SIZE`（100MB）控制。视频建议控制在几十 MB，长视频更推荐填外链（编辑器里的「视频外链」按钮）。本地落盘模式受 Next 请求体限制，适合调试小文件。

**改了 `.env` 没生效？**
Next.js 只在进程启动时读取环境变量，修改后需要重启 `npm run dev`（或重新部署）才会生效。

**文章标题是中文，链接打不开？**
slug 会保留中文（SEO 友好）。`src/app/(site)/articles/[slug]/page.tsx` 已对路由参数做 `decodeURIComponent` 处理，无需额外配置；若自行改动该页，注意不要把未解码的 params 直接拿去查库。

**忘记管理员密码**
在服务器上执行一段 Node 脚本重置：`node -e "console.log(require('bcryptjs').hashSync('新密码',10))"`，把结果写回 `admin_users.passwordHash`，或用 `npm run db:seed` 前清空该表重建。

**想开启 ISR / 静态化**
把页面顶部的 `export const dynamic = 'force-dynamic'` 换成 `export const revalidate = 300`；后台的 Server Action 已调用 `revalidatePath`，保存后会自动失效对应路径。

**首页没有内容**
先确认 `npm run db:seed` 是否执行成功；后台新建分类后需至少添加一个链接，且分类与链接的「显示」开关需为开启状态。

**深色模式怎么改主题色 / 想恢复「只跟随系统」**
所有颜色都在 `src/app/globals.css` 的 `:root`（浅色）与 `:root.dark`（深色）两组变量里，改这两块即可全局生效，组件只用语义类（`bg-surface`、`text-ink`…）。用户点过切换按钮后偏好存在 `localStorage.theme`，想恢复「跟随系统」只需在浏览器控制台执行 `localStorage.removeItem('theme')` 并刷新。首屏着色脚本在 `src/app/layout.tsx` 的 `themeScript`。

**构建时出现 `A Node.js API is used (CompressionStream ...) which is not supported in the Edge Runtime`**
来自 `next-auth` 依赖的 `jose`，属已知的无害告警：`jose` 的压缩路径不会被 NextAuth 的 JWT 会话触发，middleware 鉴权已实测正常。升级 next-auth 稳定版后可消除。
