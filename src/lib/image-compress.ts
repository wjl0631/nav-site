'use client';

/**
 * 上传前的图片压缩。
 *
 * 只处理位图，且刻意跳过几类：
 * - GIF：canvas 重绘会丢帧，动图直接变成静态首帧
 * - SVG：矢量图重绘没有意义，还可能糊掉
 * - AVIF：本身编码已经很省，再转一次反而变大
 *
 * 输出统一为 WebP（保留透明通道），长边限制在 1600px。
 * 任何一步失败都回退原文件——压缩是优化，不能成为上传失败的理由。
 */

/** 长边上限 */
const MAX_EDGE = 1600;
/** WebP 质量 */
const QUALITY = 0.82;
/** 小于此体积直接跳过，压了也不划算 */
const SKIP_BELOW = 300 * 1024;

const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml', 'image/avif']);

export type CompressResult = {
  /** 实际要上传的文件（未压缩时即原文件） */
  file: File;
  /** 原始体积，用于计算节省量 */
  originalSize: number;
  compressed: boolean;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解码失败'));
    img.src = src;
  });
}

function shouldSkip(file: File) {
  if (!file.type.startsWith('image/')) return true;
  if (SKIP_TYPES.has(file.type)) return true;
  return file.size <= SKIP_BELOW;
}

export async function compressImage(file: File): Promise<CompressResult> {
  const originalSize = file.size;
  const untouched: CompressResult = { file, originalSize, compressed: false };

  if (shouldSkip(file)) return untouched;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return untouched;

    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return untouched;

    // 缩小尺寸时用高质量插值，避免文字类截图发虚
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', QUALITY);
    });

    // 压完反而更大（小图、已优化过的图很常见），保留原文件
    if (!blob || blob.size >= originalSize) return untouched;

    const nextName = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`;
    return {
      file: new File([blob], nextName, { type: 'image/webp', lastModified: Date.now() }),
      originalSize,
      compressed: true,
    };
  } catch {
    return untouched;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
