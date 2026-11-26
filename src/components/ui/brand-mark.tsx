import { cn } from '@/lib/utils';

/**
 * 站点品牌图形：直接用渲染好的陀螺旋转 GIF（`public/brand-logo.gif`）。
 *
 * - 源图 512×512 四周留白很大，已裁到图形包围盒并缩到 256×256，透明通道保留；
 * - 深色模式下用 `invert` 把黑色图形翻成白色，否则在深色底上看不见；
 * - 有意不响应 `prefers-reduced-motion`：旋转图形是站点识别的一部分，
 *   体积小、转速慢，产品上决定在所有设备保持动态（`brand-logo-static.png` 已不再使用）。
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <picture className={cn('inline-block shrink-0', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand-logo.gif"
        alt=""
        aria-hidden
        draggable={false}
        className="h-full w-full object-contain dark:invert"
      />
    </picture>
  );
}
