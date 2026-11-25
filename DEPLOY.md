# 部署到 Vercel · 逐步操作手册

> 面向本项目（Next.js 15 App Router + Prisma + Neon Postgres + Vercel Blob + Auth.js v5）。
> 全流程约 20 分钟，其中「初始化线上数据库」是最容易漏的一步。

---

## 0. 前置检查

| 项目 | 状态 |
| --- | --- |
| 生产构建 | ✅ 已在本地验证通过：`npm run build` → 19 条路由全部生成，无类型错误 |
| Node 版本 | Vercel 默认 Node 22.x，满足 Next 15（需 ≥ 18.18） |
| 构建是否需要数据库 | ❌ 不需要。`prisma generate` 不连库，所有页面标了 `force-dynamic`，构建期不查询数据 |
| 本地上传目录 | `public/uploads` 只在 `npm run dev` 时使用；线上必须配 Vercel Blob，因为 Vercel 的 `public/` 是构建产物，运行时写入不会被托管 |

---

## 1. 准备数据库（Neon Postgres）

推荐给生产单独建一个 Neon 项目（或至少一个 branch），不要和本地开发共用，避免误操作。

Neon 控制台 → 选中项目 → 顶部 **Connect**，取两条连接串：

| 用途 | 变量 | 形态 |
| --- | --- | --- |
| 运行时（Serverless 连接池） | `DATABASE_URL` | 主机名带 `-pooler` |
| 迁移 / `db push`（直连） | `DIRECT_URL` | 主机名不带 `-pooler` |

**两条都要追加参数**：

```
?sslmode=require&connect_timeout=30&pgbouncer=true
```

- `connect_timeout=30`：Neon 计算实例冷启动约 3–5 秒，太短会报 `P1001`。
- `pgbouncer=true`：**Vercel 上必加**。Serverless 会并发拉起多个实例，PgBouncer 事务模式下不加这个参数容易出现
  `prepared statement "s0" already exists`。
- 如果连接串里的 `channel_binding=require` 导致 Prisma 报 `P1013`（连接串不合法），把它删掉即可。

---

## 2. 准备媒体存储（Vercel Blob）

Vercel 项目页 → **Storage** → **Create Database** → 选 **Blob** → 创建后 **Connect to Project**。

连接成功后，`BLOB_READ_WRITE_TOKEN` 会自动注入到项目的环境变量（Production / Preview / Development 都注）。
如果没自动注入，去 Storage 页复制 token 手动加到环境变量里。

> 未配置 Blob 时：线上上传会直接报「未配置媒体存储」，本地 `npm run dev` 则回退写 `public/uploads/`。

---

## 3. 把代码推到 Git

```bash
git status          # 确认 .env 没被跟踪（.gitignore 已包含）
git add -A
git commit -m "chore: release"
git push origin main
```

`.gitignore` 已经忽略了 `.env`、`.env*.local`、`.next`、`node_modules`、`public/uploads/*`，直接提交即可。

---

## 4. 在 Vercel 导入项目

1. Vercel → **Add New → Project** → 选中刚推的仓库。
2. 配置保持默认即可（`vercel.json` 已经声明了关键项）：

| 配置项 | 值 | 来源 |
| --- | --- | --- |
| Framework Preset | Next.js | 自动识别 |
| Build Command | `npm run build` | `vercel.json` |
| Install Command | `npm install` | `vercel.json`（`postinstall` 会跑一次 `prisma generate`） |
| Region | `sin1`（新加坡） | `vercel.json`，与 Neon 的 ap-southeast-1 同区，延迟最低 |
| Root Directory | 仓库根目录 | 默认 |

> `build` 脚本是 `prisma generate && next build`，所以即使 `postinstall` 被跳过也不会缺 Prisma Client。

3. **先别点 Deploy**，下面这一步环境变量必须先填好，否则首屏就 500。

---

## 5. 配置环境变量

Vercel → 项目 → **Settings → Environment Variables**，逐条添加，勾选 **Production + Preview**（`DEVELOPMENT` 可不填）。

| 变量 | 必填 | 值 / 生成方式 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Neon pooled 串，带 `&pgbouncer=true` |
| `DIRECT_URL` | ✅ | Neon direct 串（Prisma schema 里 `directUrl` 用到，缺了会在 generate 时告警） |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` 生成；Windows 可用 `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_TRUST_HOST` | 建议 | `true`（代码里 `authConfig.trustHost: true` 已兜底，写上更直观） |
| `NEXT_PUBLIC_SITE_NAME` | 建议 | `浮生若梦` |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | 可选 | 站点描述，用于 `<meta>` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://<你的域名>`，**不要带结尾斜杠**；影响 canonical / OG / JSON-LD |
| `ADMIN_EMAIL` | ✅ | 初始管理员邮箱 |
| `ADMIN_PASSWORD` | ✅ | 初始管理员密码，**部署后请改强密码** |
| `BLOB_READ_WRITE_TOKEN` | ✅ | 第 2 步自动注入，检查一下是否存在 |

⚠️ `NEXT_PUBLIC_*` 是**构建期**注入的常量：改完必须 **Redeploy** 才会生效，改环境变量本身不够。

填完点 **Deploy**。

---

## 6. 初始化线上数据库（关键步骤）

Vercel 只负责跑应用，**不会自动建表、也不会创建管理员**。首次部署完成后，在本地用生产连接串执行一次：

**Windows · PowerShell**

```powershell
$env:DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require&connect_timeout=30&pgbouncer=true"
$env:DIRECT_URL="postgresql://.../neondb?sslmode=require&connect_timeout=30"
npx prisma db push
npm run db:seed
```

**macOS / Linux / Git Bash**

```bash
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://..." npx prisma db push
DATABASE_URL="postgresql://...-pooler..." DIRECT_URL="postgresql://..." npm run db:seed
```

- `db push` 按 `prisma/schema.prisma` 建表（本项目没有 migrations 目录，用 push 而非 migrate）。
- `db:seed` 会 **upsert** 管理员账号，同时灌入示例分类 / 链接 / 一篇演示文章。
  - 想保持生产干净：跑完后登录后台把示例内容删掉即可（管理员账号本身不受影响）。
  - 再次执行是安全的：`adminUser.upsert({ update: {} })` 不会覆盖已有密码。

完成后访问 `https://<你的域名>/admin/login`，用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录。

---

## 7. 绑定域名

1. Vercel → Settings → **Domains** → 添加域名，按提示配 CNAME / A 记录。
2. 回到 **Environment Variables**，把 `NEXT_PUBLIC_SITE_URL` 改成正式域名（`https://xxx.com`）。
3. **Deployments → 最新一条 → Redeploy**（`NEXT_PUBLIC_*` 需要重新构建）。

---

## 8. 上线验收清单

发布后逐项点一遍：

- [ ] 首页能出分类与链接，图标走「站点 favicon → DuckDuckGo → 首字母」三级回退
- [ ] `/articles` 列表与文章详情正常，代码块横向滚动条是深色细条款式
- [ ] 随便打开一个不存在的 `/articles/xxx`，404 页有导航栏与页脚
- [ ] 顶栏搜索：首页即时过滤、其他页跳 `/articles?q=`
- [ ] 右上角主题切换，刷新后不闪白
- [ ] 波浪背景与页脚固定在视口底部，页面滚动时不动
- [ ] `/admin/login` 能登录，错密码有提示
- [ ] 后台新建一个链接，保存后首页出现
- [ ] 文章编辑器上传一张图片 → 返回的地址是 `https://xxx.public.blob.vercel-storage.com/...`
- [ ] 文章编辑器里切到 Markdown 源码 → 写完切回富文本 → 发布 → 详情页正常
- [ ] 粘贴一段 Markdown 到富文本，能自动转成标题 / 列表 / 引用
- [ ] 手机（或 DevTools 390px）下打开首页与文章页，页脚单行、不横向溢出

---

## 9. 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 构建报 `EPERM ... .next/trace`（本地） | 还有 `next dev` 进程占着 `.next`。先停掉 dev，再 `rm -rf .next` 后重新 build |
| 页面 500，日志出现 `Can't reach database server` / `P1001` | Neon 冷启动超时。连接串确认带 `connect_timeout=30`；顺便检查 Vercel 的 region 是否和 Neon 同区 |
| `prepared statement "s0" already exists` | `DATABASE_URL` 漏了 `&pgbouncer=true` |
| `P1013` 连接串不合法 | 删掉连接串里的 `channel_binding=require` |
| 后台能登录但刷新就掉线 | `AUTH_SECRET` 没配或每次部署被换掉；确认它固定在 Production 环境变量里 |
| 上传提示「未配置媒体存储」 | `BLOB_READ_WRITE_TOKEN` 没注入到 Production，去 Storage 页面重新 Connect |
| 上传成功但图片 404 | `next.config.mjs` 已放开所有 https 图源，通常是 Blob store 被删或域名变了 |
| 改了 `NEXT_PUBLIC_SITE_NAME` 没变化 | 这是构建期变量，必须 Redeploy |
| 部署成功但登录报「邮箱或密码错误」 | 第 6 步没执行，数据库里没有管理员账号 |
| 示例内容想彻底清掉 | 反复执行 seed 只会新增示例（按 slug upsert），登录后台删除即可 |

---

## 10. 回滚

Vercel → Deployments → 选上一个成功的版本 → **Promote to Production**。
数据库结构不受影响（本项目用 `db push`，没有自动迁移），但如果手动改过 schema，需要自己评估回滚影响。
