/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type SeedLink = {
  title: string;
  url: string;
  description: string;
  iconUrl?: string;
  isFeatured?: boolean;
};

type SeedCategory = {
  name: string;
  slug: string;
  icon: string;
  description: string;
  sortOrder: number;
  links: SeedLink[];
};

const CATEGORIES: SeedCategory[] = [
  {
    name: '开发工具',
    slug: 'dev-tools',
    icon: '🛠',
    description: '日常开发离不开的效率工具与代码托管平台',
    sortOrder: 10,
    links: [
      { title: 'GitHub', url: 'https://github.com', description: '全球最大的代码托管与协作平台', iconUrl: 'https://github.com/favicon.ico', isFeatured: true },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: '前端标准与技术文档的权威参考' },
      { title: 'Stack Overflow', url: 'https://stackoverflow.com', description: '程序员的问答社区' },
      { title: 'Can I use', url: 'https://caniuse.com', description: '查询浏览器特性兼容性' },
    ],
  },
  {
    name: '设计资源',
    slug: 'design',
    icon: '🎨',
    description: '配色、图标、插图与灵感素材',
    sortOrder: 20,
    links: [
      { title: 'Figma', url: 'https://www.figma.com', description: '在线协作设计工具', isFeatured: true },
      { title: 'Dribbble', url: 'https://dribbble.com', description: '设计师作品与灵感社区' },
      { title: 'Coolors', url: 'https://coolors.co', description: '快速生成配色方案' },
      { title: 'Iconify', url: 'https://icon-sets.iconify.design', description: '海量开源图标集合' },
    ],
  },
  {
    name: '效率工具',
    slug: 'productivity',
    icon: '⚡️',
    description: '让信息处理与协作更顺畅',
    sortOrder: 30,
    links: [
      { title: 'Notion', url: 'https://www.notion.so', description: '文档、数据库与项目管理一体化' },
      { title: 'Excalidraw', url: 'https://excalidraw.com', description: '手绘风格的白板与流程图' },
      { title: 'TinyPNG', url: 'https://tinypng.com', description: '在线压缩图片体积' },
    ],
  },
  {
    name: 'AI 工具',
    slug: 'ai',
    icon: '🤖',
    description: '大模型、生成式内容与自动化',
    sortOrder: 40,
    links: [
      { title: 'ChatGPT', url: 'https://chat.openai.com', description: '通用对话与写作助手', isFeatured: true },
      { title: 'Claude', url: 'https://claude.ai', description: '擅长长文本理解与写作' },
      { title: 'Hugging Face', url: 'https://huggingface.co', description: '开源模型与数据集社区' },
    ],
  },
];

const DEMO_ARTICLE_SLUG = 'welcome-to-nav';

const demoContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '这是一个开箱即用的导航站示例文章，用来演示正文排版与多媒体嵌入能力。你可以登录后台，在「文章管理」中编辑或删除它。' },
      ],
    },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '它包含哪些能力' }] },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '分类导航：按分类展示站点，支持排序、显示/隐藏与精选标记' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '文章系统：草稿与发布分离，支持封面、标签与 SEO 字段' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '多媒体正文：图片、视频、音频可直接上传并内联播放' }] }] },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '正文支持图片、视频与音频：在编辑器工具栏点击「插入图片 / 上传视频 / 上传音频」即可，媒体会存到 Vercel Blob（本地开发存到 public/uploads），读者可在文中直接播放。' },
      ],
    },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '代码块' }] },
    { type: 'codeBlock', attrs: { language: 'bash' }, content: [{ type: 'text', text: 'npm install\nnpm run db:push\nnpm run db:seed\nnpm run dev' }] },
    {
      type: 'blockquote',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '提示：封面与正文媒体都可以直接在编辑器里上传，文件会存到 Vercel Blob。' }] },
      ],
    },
  ],
};

const demoHtml = `<p>这是一个开箱即用的导航站示例文章，用来演示正文排版与多媒体嵌入能力。你可以登录后台，在「文章管理」中编辑或删除它。</p>
<h2>它包含哪些能力</h2>
<ul>
  <li>分类导航：按分类展示站点，支持排序、显示/隐藏与精选标记</li>
  <li>文章系统：草稿与发布分离，支持封面、标签与 SEO 字段</li>
  <li>多媒体正文：图片、视频、音频可直接上传并内联播放</li>
</ul>
<p>正文支持图片、视频与音频：在编辑器工具栏点击「插入图片 / 上传视频 / 上传音频」即可，媒体会存到 Vercel Blob（本地开发存到 public/uploads），读者可在文中直接播放。</p>
<h3>代码块</h3>
<pre><code>npm install
npm run db:push
npm run db:seed
npm run dev</code></pre>
<blockquote><p>提示：封面与正文媒体都可以直接在编辑器里上传，文件会存到 Vercel Blob。</p></blockquote>`;

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: '管理员',
      passwordHash: await bcrypt.hash(password, 10),
      role: 'OWNER',
    },
  });
  console.log(`✓ 管理员账号：${admin.email}`);

  for (const category of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, icon: category.icon, description: category.description },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        description: category.description,
        sortOrder: category.sortOrder,
      },
    });

    const existing = await prisma.link.count({ where: { categoryId: created.id } });
    if (existing === 0) {
      await prisma.link.createMany({
        data: category.links.map((link, index) => ({
          categoryId: created.id,
          title: link.title,
          url: link.url,
          description: link.description,
          iconUrl: link.iconUrl ?? null,
          isFeatured: Boolean(link.isFeatured),
          sortOrder: (index + 1) * 10,
        })),
      });
    }
    console.log(`✓ 分类：${category.name}（${category.links.length} 个链接）`);
  }

  await prisma.article.upsert({
    where: { slug: DEMO_ARTICLE_SLUG },
    update: {},
    create: {
      title: '欢迎使用浮生若梦',
      slug: DEMO_ARTICLE_SLUG,
      summary: '一篇示例文章，演示标题、正文、图片、视频与音频的展示效果。',
      coverUrl: 'https://picsum.photos/seed/nav-site/1200/675',
      content: demoContent,
      contentHtml: demoHtml,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      isFeatured: true,
      tags: ['示例', '使用说明'],
    },
  });
  console.log('✓ 示例文章已就绪');

  console.log('\n完成。使用以下账号登录 /admin ：');
  console.log(`  邮箱：${email}`);
  console.log(`  密码：${password}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
