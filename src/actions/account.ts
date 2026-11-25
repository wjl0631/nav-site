'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { passwordSchema } from '@/lib/validators';
import { formToObject, zodMessage, type ActionResult } from '@/lib/result';

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = passwordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };

  const record = await prisma.adminUser.findUnique({ where: { id: user.id } });
  if (!record) return { ok: false, error: '账号不存在' };

  const valid = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
  if (!valid) return { ok: false, error: '当前密码不正确' };

  await prisma.adminUser.update({
    where: { id: record.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });

  revalidatePath('/admin/settings');
  return { ok: true, message: '密码已更新，下次登录请使用新密码' };
}
