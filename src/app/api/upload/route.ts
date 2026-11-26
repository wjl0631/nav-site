import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/lib/auth';
import { ALLOWED_CONTENT_TYPES, blobConfigured } from '@/lib/media-meta';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

// 白名单与上传中转路由共用一份，见 src/lib/media-meta.ts

function blobEnabled() {
  return blobConfigured();
}

/** 前端据此决定走 Blob 直传，还是回退到本地 public/uploads 落盘 */
export async function GET(): Promise<NextResponse> {
  const mode = blobEnabled() ? 'blob' : process.env.NODE_ENV === 'production' ? 'disabled' : 'local';
  return NextResponse.json({ mode });
}

/**
 * Vercel Blob 客户端直传的令牌签发端点。
 * 客户端先由浏览器直接上传到 Blob（绕过 Serverless 4.5MB 请求体限制），
 * 上传完成后再调用 saveMediaAction 记录到媒体中心。
 */
export async function POST(request: Request): Promise<NextResponse> {
  // 先校验会话，避免未登录请求进入 Blob 流程
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录，无法上传' }, { status: 401 });
  }

  if (!blobEnabled()) {
    return NextResponse.json(
      {
        error:
          '未配置 Blob 存储（线上必需）。请在 Vercel 项目 Storage 中连接一个 Blob Store；本地开发留空即可，系统会自动回退到 public/uploads。',
      },
      { status: 409 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error('未登录，无法上传');
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // 记录动作由前端调用 Server Action 完成（本地开发不会触发此回调）
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : '上传失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
