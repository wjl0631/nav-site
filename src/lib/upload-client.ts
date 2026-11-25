'use client';

import { upload } from '@vercel/blob/client';
import { saveMediaAction } from '@/actions/media';

export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

export type UploadedMedia = { url: string; type: MediaKind; filename: string; size: number };

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
  const type = kindOf(file);

  if (mode === 'disabled') {
    throw new Error(NO_STORAGE_MESSAGE);
  }

  if (mode === 'blob') {
    const pathname = `${type.toLowerCase()}/${Date.now()}-${safeName(file.name)}`;
    const blob = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      onUploadProgress: (event) => onProgress?.(Math.round(event.percentage)),
    });

    await saveMediaAction({
      url: blob.url,
      type,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    });

    return { url: blob.url, type, filename: file.name, size: file.size };
  }

  const body = new FormData();
  body.append('file', file);
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
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
  });

  return { url: data.url, type: data.type ?? type, filename: file.name, size: file.size };
}

export function formatSize(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
