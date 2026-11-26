'use client';

import * as React from 'react';
import { cn, isImageIcon, normalizeIconSrc } from '@/lib/utils';

/**
 * 分类图标渲染：图片地址走 <img>，其余（emoji / 首字）按文本渲染。
 *
 * 刻意不用 next/image —— 图标最大只有 32px，走优化器没有收益；
 * 而且 SVG 需要额外打开 dangerouslyAllowSVG，用原生 img 可以避开这个开关。
 * <img> 上下文不会执行 SVG 内嵌脚本，因此允许用户填任意外部 SVG 地址是安全的。
 *
 * 加载失败（例如 Iconify 图标名写错、外链失效）时回落到名称首字，
 * 而不是留一个灰色的破图占位。
 */
export function CategoryGlyph({
  icon,
  name,
  imgClassName,
}: {
  icon?: string | null;
  name: string;
  /** 只作用于图片形态；文本形态由外层容器的字号控制 */
  imgClassName?: string;
}) {
  const isImage = isImageIcon(icon);
  const src = React.useMemo(() => (isImage ? normalizeIconSrc(icon) : ''), [icon, isImage]);
  const [failed, setFailed] = React.useState(false);

  // 换了地址就重新给一次机会
  React.useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('object-contain', imgClassName ?? 'h-full w-full')}
      />
    );
  }

  const text = isImage ? '' : (icon ?? '').trim();
  return <>{text || name.slice(0, 1)}</>;
}
