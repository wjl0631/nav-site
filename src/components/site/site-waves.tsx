import { cn } from '@/lib/utils';

/**
 * 全站背景：三层极淡的水波，钉在视口底部慢慢横向漂移（滚动时也一直在）。
 * 只是氛围，不接收指针事件；`main` 需要 `isolate`，水波用 `z-10` 盖在本层内容之上，
 * 长文章滚到底部时文字像浸在水面下（`pointer-events-none` 保证不影响点击与选中）。
 * 底部让出「页脚固定高度 + 1rem」，水面与页脚之间留一道空隙，不会被页脚直接切断。
 *
 * 每条 path 首尾同高，配合整条带子平移一份宽度即可无缝循环。
 * fill 铺水面、stroke 勾一道水线 —— 只有填充时小屏上会糊成一片雾，描边让波峰立住。
 * 不透明度用 CSS 变量交给 path 的 fill-opacity / stroke-opacity，暗色下再抬一档。
 *
 * 有意不响应 prefers-reduced-motion：波形填充不透明度只有 3.8%–6%、
 * 单层横移周期 40–76 秒，几乎不构成眩晕诱因，产品上决定在所有设备保持动态。
 * 若将来要恢复无障碍降级，在这里加回 motion-reduce:animate-none。
 */
const WAVES = [
  {
    // 最远的一层：面积最大也最淡
    className:
      'flex h-[225px] [--wv-f:0.038] [--wv-s:0.065] dark:[--wv-f:0.075] dark:[--wv-s:0.1] sm:h-[270px] animate-[waveDrift_76s_linear_infinite]',
    d: 'M0,180 C160,140 320,220 480,180 C640,140 800,220 960,180 C1120,140 1280,220 1440,180 L1440,320 L0,320 Z',
  },
  {
    className:
      'flex h-[180px] [--wv-f:0.048] [--wv-s:0.08] dark:[--wv-f:0.085] dark:[--wv-s:0.13] sm:h-[205px] animate-[waveDrift_56s_linear_infinite]',
    d: 'M0,160 C180,200 360,120 540,160 C720,200 900,120 1080,160 C1260,200 1380,140 1440,160 L1440,320 L0,320 Z',
  },
  {
    className:
      'flex h-[138px] [--wv-f:0.06] [--wv-s:0.1] dark:[--wv-f:0.095] dark:[--wv-s:0.15] sm:h-[150px] animate-[waveDrift_40s_linear_infinite]',
    d: 'M0,200 C140,160 300,240 460,200 C620,160 780,240 940,200 C1100,160 1260,240 1440,200 L1440,320 L0,320 Z',
  },
];

export function SiteWaves() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-[calc(3rem+env(safe-area-inset-bottom)+1rem)] z-10 h-[52dvh] max-h-[470px] overflow-hidden [mask-image:linear-gradient(to_top,transparent_0%,black_8%,black_55%,transparent_100%)]"
    >
      {WAVES.map((wave) => (
        <div
          key={wave.d}
          className={cn(
            'absolute inset-x-0 bottom-0 w-[200%]',
            wave.className,
          )}
        >
          {[0, 1].map((i) => (
            <svg
              key={i}
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              className="h-full w-1/2 shrink-0 text-brand"
            >
              {/* 水面用它填充；波峰线单独一条不闭合的 path，否则闭合边会在接缝处画出竖线 */}
              <path d={wave.d} fill="currentColor" style={{ fillOpacity: 'var(--wv-f)' }} />
              <path
                d={wave.d.slice(0, wave.d.indexOf(' L1440'))}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
                style={{ strokeOpacity: 'var(--wv-s)' }}
              />
            </svg>
          ))}
        </div>
      ))}
    </div>
  );
}
