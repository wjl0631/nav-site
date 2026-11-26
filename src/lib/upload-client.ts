'use client';

import { upload } from '@vercel/blob/client';
import { saveMediaAction } from '@/actions/media';
import { compressImage } from './image-compress';

export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

export type UploadedMedia = {
  url: string;
  type: MediaKind;
  filename: string;
  /** 实际入库体积（压缩后） */
  size: number;
  /** 原始体积；未压缩时与 size 相同 */
  originalSize: number;
  /** 是否发生了压缩 */
  compressed: boolean;
};

function kindOf(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type.startsWith('audio/')) return 'AUDIO';
  if (file.type.startsWith('image/')) return 'IMAGE';
  return 'FILE';
}

function safeName(name: string) {
  const cleaned = name.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-');
  return cleaned.slice(-60) || 'file';
}

let cachedMode: 'blob' | 'local' | 'disabled' | null = null;

/** 探测存储模式：有 Blob Token 走直传；本地开发落盘；线上未配置则直接报错 */
async function storageMode(): Promise<'blob' | 'local' | 'disabled'> {
  if (cachedMode) return cachedMode;
  try {
    const res = await fetch('/api/upload', { method: 'GET' });
    const data = (await res.json()) as { mode?: 'blob' | 'local' | 'disabled' };
    cachedMode = data.mode ?? 'disabled';
  } catch {
    cachedMode = 'disabled';
  }
  return cachedMode;
}

const NO_STORAGE_MESSAGE =
  '未配置媒体存储：请在 Vercel 项目 Storage 中创建 Blob Store（或填入 BLOB_READ_WRITE_TOKEN）后再上传。';

/**
 * 上传媒体并登记到媒体中心。
 * - Blob 模式：浏览器直传 Vercel Blob（支持大文件，绕过 4.5MB 请求体限制）
 * - 本地模式：POST /api/upload/local 写入 public/uploads（仅开发环境可用）
 */
export async function uploadAndRegister(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<UploadedMedia> {
  const mode = await storageMode();

  if (mode === 'disabled') {
    throw new Error(NO_STORAGE_MESSAGE);
  }

  // 压缩阶段耗时且无法上报细粒度进度，先给个非零值：
  // 否则一张大图可能让进度条停在字面上的 0%，看起来像卡死了
  onProgress?.(2);

  // 图片先压缩再上传：直接决定 Blob 存储与流量的消耗速度
  const { file: target, originalSize, compressed } = await compressImage(file);
  const type = kindOf(target);
  onProgress?.(10);

  const done = (url: string, savedType: MediaKind): UploadedMedia => ({
    url,
    type: savedType,
    filename: target.name,
    size: target.size,
    originalSize,
    compressed,
  });

  if (mode === 'blob') {
    const pathname = `${type.toLowerCase()}/${Date.now()}-${safeName(target.name)}`;
    const blob = await upload(pathname, target, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      // 把传输进度映射到 10%~99%，让整条进度条连续推进
      onUploadProgress: (event) => {
        onProgress?.(Math.min(99, 10 + Math.round(event.percentage * 0.89)));
      },
    });
    onProgress?.(100);

    await saveMediaAction({
      url: blob.url,
      type,
      filename: target.name,
      mimeType: target.type || 'application/octet-stream',
      size: target.size,
    });

    return done(blob.url, type);
  }

  const body = new FormData();
  body.append('file', target);
  onProgress?.(30);
  const res = await fetch('/api/upload/local', { method: 'POST', body });
  const data = (await res.json()) as { url?: string; type?: MediaKind; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || '上传失败');
  }
  onProgress?.(100);

  await saveMediaAction({
    url: data.url,
    type: data.type ?? type,
    filename: target.name,
    mimeType: target.type || 'application/octet-stream',
    size: target.size,
  });

  return done(data.url, data.type ?? type);
}

export function formatSize(bytes: number) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
