'use client';

import * as React from 'react';
import { cn, duckIconOf, faviconOf } from '@/lib/utils';

type Size = 'xxs' | 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { box: string; text: string; radius: string }> = {
  xxs: { box: 'h-6 w-6', text: 'text-[10px]', radius: 'rounded-md' },
  xs: { box: 'h-8 w-8', text: 'text-[11px]', radius: 'rounded-lg' },
  sm: { box: 'h-7 w-7', text: 'text-[11px]', radius: 'rounded-lg' },
  md: { box: 'h-9 w-9', text: 'text-[12px]', radius: 'rounded-lg' },
  lg: { box: 'h-11 w-11', text: 'text-sm', radius: 'rounded-lg' },
};

/**
 * 站点图标，按「站点 /favicon.ico → DuckDuckGo 图标服务 → 首字母」三级回退。
 *
 * 传 `url`（链接本身地址）即可自动推导前两级，`src` 只在后台手工指定图标时用得上；
 * 两者都传时手动图标排在最前，失败后仍会回落到站点 favicon 与兜底服务。
 */
export function SiteIcon({
  src,
  url,
  title,
  size = 'md',
  className,
  fallback,
}: {
  src?: string | null;
  url?: string | null;
  title: string;
  size?: Size;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const chain = React.useMemo(() => {
    const site = url ? faviconOf(url) : '';
    const duck = url ? duckIconOf(url) : '';
    return Array.from(new Set([src?.trim() || site, site, duck].filter(Boolean))) as string[];
  }, [src, url]);

  const [stage, setStage] = React.useState(0);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const key = chain.join('|');

  // 源变化（换了链接/改了图标）时从头开始尝试
  React.useEffect(() => setStage(0), [key]);

  const solid = SIZES[size];
  const letter = (title.trim()[0] ?? '').toUpperCase();
  const current = stage < chain.length ? chain[stage] : null;

  // favicon 常在 hydration 之前就 404，error 事件因此丢失，这里补一次判定
  React.useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setStage((s) => s + 1);
  }, [current]);

  return (
    <span
      className={cn(
        // 不写 relative：调用方常用 absolute 把它浮在输入框里，两个 position 类同时存在时
        // 由样式表顺序决定胜负（relative 会赢），图标就会掉回文档流挤开输入框
        // 深色模式下图标容器反转为浅色，否则黑底 logo（GitHub 等）会糊掉
        'grid shrink-0 place-items-center overflow-hidden border border-border bg-surface-2 font-semibold text-muted',
        'dark:border-white/10 dark:bg-white/90 dark:text-[#3d4552]',
        solid.box,
        solid.text,
        solid.radius,
        className,
      )}
      aria-hidden
    >
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={current}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setStage((s) => s + 1)}
          className="h-full w-full object-cover"
        />
      ) : letter ? (
        <span>{letter}</span>
      ) : (
        (fallback ?? <span>?</span>)
      )}
    </span>
  );
}
