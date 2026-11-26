'use client';

import { upload } from '@vercel/blob/client';
import { saveMediaAction } from '@/actions/media';
import { compressImage } from './image-compress';
import { SERVER_UPLOAD_LIMIT, kindOf, safeName, type MediaKind } from './media-meta';

export type { MediaKind };

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
 * 用 XHR 上传同源接口，目的是拿到真实的上传进度。
 *
 * fetch 没有上传进度事件，而这条路是我们自己的域名、不受跨域限制，
 * 用 XHR 既能上报进度又最稳。
 */
function postForm(url: string, body: FormData, onProgress?: (percentage: number) => void) {
  return new Promise<{ status: number; data: { url?: string; error?: string } | null }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let data: { url?: string; error?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error('网络中断，上传失败'));
    xhr.ontimeout = () => reject(new Error('上传超时，请重试'));
    xhr.send(body);
  });
}

/**
 * 常见但浏览器无法直接显示/播放的格式，给出具体出路。
 * 这些类型即便允许上传，站点上也是裂图或无法播放，所以不给「换个格式重试」之外的选项。
 */
const TYPE_HINTS: Record<string, string> = {
  heic: 'HEIC 是苹果专有格式，多数浏览器无法显示。请在相册里「导出为 JPG」或「兼容性最佳」后再传',
  heif: 'HEIF 是苹果/相机常用格式，多数浏览器无法显示。请导出为 JPG 后再传',
  dng: 'DNG 是相机 RAW 格式，浏览器无法显示。请先导出为 JPG',
  cr2: 'CR2 是佳能 RAW 格式，浏览器无法显示。请先导出为 JPG',
  nef: 'NEF 是尼康 RAW 格式，浏览器无法显示。请先导出为 JPG',
  psd: 'PSD 是 Photoshop 工程文件，浏览器无法显示。请导出为 PNG/JPG 后上传',
  mkv: 'MKV 容器浏览器普遍不支持播放。请转成 MP4（H.264）后再传',
  avi: 'AVI 容器浏览器普遍不支持播放。请转成 MP4（H.264）后再传',
  wmv: 'WMV 格式浏览器不支持播放。请转成 MP4 后再传',
  flv: 'FLV 格式浏览器不支持播放。请转成 MP4 后再传',
};

function extOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

/**
 * 把直传失败翻译成能指导操作的话。
 *
 * 之前的写法一律断言「被跨域拦截」，但真实失败原因有好几种
 * （类型不在白名单、超出体积上限、临时网络错误、确实跨域），
 * 猜错原因比不给提示更糟——用户会照着错误的方向去压缩文件。
 */
function describeUploadError(error: unknown, file: File): string {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error);

  if (/ContentTypeNotAllowed/i.test(name) || /is not allowed/i.test(message)) {
    const ext = extOf(file.name);
    const hint = TYPE_HINTS[ext];
    if (hint) return hint;
    const type = file.type || ext || '未知';
    return `不支持这种文件类型（${type}），可上传图片、音视频、PDF、Office 文档或 zip/rar/7z 压缩包`;
  }
  if (/FileTooLarge/i.test(name) || /too large/i.test(message)) {
    return `文件超过单次上传上限（100MB），请压缩后再传`;
  }
  if (/CORS|cross-origin|Failed to fetch|NetworkError|Load failed|ERR_FAILED/i.test(message)) {
    return `浏览器直传被网络策略拦截，可重试一次；仍失败请把文件压到 4MB 以内（走服务器中转），或改用外链地址`;
  }
  return `上传失败：${message.slice(0, 140)}`;
}

/**
 * 上传媒体并登记到媒体中心。
 * - Blob 模式：≤4MB 经服务端中转（绕开浏览器直传的 CORS 限制）；更大文件走浏览器直传
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
    // 主路径：同源上传，由服务端 put() 落到 Blob。
    // 浏览器直传 blob.vercel-storage.com 在部分项目上会被平台 CORS 拦截
    //（响应缺 Access-Control-Allow-Origin，前端表现为卡在 10% 后反复重试）。
    if (target.size <= SERVER_UPLOAD_LIMIT) {
      const body = new FormData();
      body.append('file', target);

      const res = await postForm('/api/upload/server', body, (p) =>
        onProgress?.(Math.min(99, 10 + Math.round(p * 0.89))),
      );

      if (res.status !== 200 || !res.data?.url) {
        throw new Error(res.data?.error || '上传失败');
      }

      onProgress?.(100);
      await saveMediaAction({
        url: res.data.url,
        type,
        filename: target.name,
        mimeType: target.type || 'application/octet-stream',
        size: target.size,
      });
      return done(res.data.url, type);
    }

    // 超过中转上限（平台请求体 4.5MB），只能走浏览器直传
    const pathname = `${type.toLowerCase()}/${Date.now()}-${safeName(target.name)}`;
    let blobUrl: string;
    try {
      const blob = await upload(pathname, target, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        onUploadProgress: (event) => {
          onProgress?.(Math.min(99, 10 + Math.round(event.percentage * 0.89)));
        },
      });
      blobUrl = blob.url;
    } catch (error) {
      throw new Error(describeUploadError(error, target));
    }

    onProgress?.(100);
    await saveMediaAction({
      url: blobUrl,
      type,
      filename: target.name,
      mimeType: target.type || 'application/octet-stream',
      size: target.size,
    });
    return done(blobUrl, type);
  }

  const body = new FormData();
  body.append('file', target);
  const res = await postForm('/api/upload/local', body, (p) =>
    onProgress?.(Math.min(99, 10 + Math.round(p * 0.89))),
  );
  if (res.status !== 200 || !res.data?.url) {
    throw new Error(res.data?.error || '上传失败');
  }
  onProgress?.(100);

  await saveMediaAction({
    url: res.data.url,
    type,
    filename: target.name,
    mimeType: target.type || 'application/octet-stream',
    size: target.size,
  });

  return done(res.data.url, type);
}

export function formatSize(bytes: number) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
