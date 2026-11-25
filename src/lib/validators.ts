import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const boolFlag = z
  .union([z.boolean(), z.string(), z.undefined()])
  .transform((v) => v === true || v === 'true' || v === 'on' || v === '1');

const sortField = z
  .union([z.number(), z.string(), z.undefined()])
  .transform((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  });

export const loginSchema = z.object({
  email: z.string().trim().email('请输入合法邮箱'),
  password: z.string().min(6, '密码至少 6 位'),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, '分类名称必填').max(40, '名称过长'),
  slug: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : undefined)),
  icon: optionalText(300),
  description: optionalText(200),
  sortOrder: sortField,
  isVisible: boolFlag,
});

export const linkSchema = z.object({
  categoryId: z.string().trim().min(1, '请选择分类'),
  title: z.string().trim().min(1, '标题必填').max(60, '标题过长'),
  url: z
    .string()
    .trim()
    .min(1, '链接必填')
    .refine((v) => /^(https?:\/\/|mailto:|tel:|\/)/i.test(v.trim()), '请输入 http(s) 开头的链接'),
  description: optionalText(200),
  iconUrl: optionalText(500),
  sortOrder: sortField,
  isVisible: boolFlag,
  isFeatured: boolFlag,
});

export const articleSchema = z.object({
  title: z.string().trim().min(1, '标题必填').max(120, '标题过长'),
  slug: z
    .string()
    .trim()
    .max(90)
    .optional()
    .transform((v) => (v ? v : undefined)),
  summary: optionalText(300),
  coverUrl: optionalText(600),
  contentHtml: z.string().default(''),
  contentJson: z.string().default('{"type":"doc","content":[]}'),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  isFeatured: boolFlag,
  tags: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8),
    ),
  seoTitle: optionalText(120),
  seoDescription: optionalText(200),
});

export const mediaSchema = z.object({
  // 允许绝对地址（Blob/CDN）与站内相对地址（本地开发写入 public/uploads）
  url: z
    .string()
    .trim()
    .min(1, '媒体地址不能为空')
    .refine((v) => /^https?:\/\//i.test(v) || v.startsWith('/'), '媒体地址不合法'),
  type: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']),
  filename: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(120),
  size: z.coerce.number().int().nonnegative().default(0),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, '请输入当前密码'),
    newPassword: z.string().min(8, '新密码至少 8 位'),
    confirmPassword: z.string().min(8, '请确认新密码'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  });

export type CategoryInput = z.infer<typeof categorySchema>;
export type LinkInput = z.infer<typeof linkSchema>;
export type ArticleInput = z.infer<typeof articleSchema>;
