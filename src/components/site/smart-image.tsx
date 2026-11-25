'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * 带降级的图片组件：
 * 1. 先走 next/image 优化（WebP/AVIF + 尺寸裁剪）
 * 2. 优化失败（外链站点超时 / 防盗链 / 不支持代理）时回退到原始地址直连
 * 3. 仍失败则显示品牌色渐变占位，避免出现“裂图”
 */
export function SmartImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [stage, setStage] = React.useState<'optimized' | 'direct' | 'failed'>('optimized');

  React.useEffect(() => {
    setStage('optimized');
  }, [src]);

  if (stage === 'failed') {
    return (
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-soft via-surface-2 to-surface text-3xl font-semibold text-brand/60',
          className,
        )}
        aria-label={alt}
        role="img"
      >
        {alt.slice(0, 1)}
      </div>
    );
  }

  if (stage === 'direct') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        onError={() => setStage('failed')}
        className={cn('absolute inset-0 h-full w-full object-cover', className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? '100vw'}
      priority={priority}
      onError={() => setStage('direct')}
      className={cn('object-cover', className)}
    />
  );
}
