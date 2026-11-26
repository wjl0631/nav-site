import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/**
 * 全站背景：三层极淡的水波，钉在视口底部慢慢横向漂移（滚动时也一直在）。
 * 只是氛围，不接收指针事件；`main` 需要 `isolate`，水波用 `z-10` 盖在本层内容之上，
 * 长文章滚到底部时文字像浸在水面下（`pointer-events-none` 保证不影响点击与选中）。
 *
 * 每条 path 首尾同高，配合整条带子平移一份宽度即可无缝循环。
 * fill 铺水面、stroke 勾一道水线 —— 只有填充时小屏上会糊成一片雾，描边让波峰立住。
 * 不透明度用 CSS 变量交给 path 的 fill-opacity / stroke-opacity，暗色下再抬一档。
 *
 * 最远的一层单独成容器：它的下沿要越过「页脚 + 1rem」的空隙一直铺到页面底部，
 * 而另外两层在空隙上方收住（容器底部有渐隐）。两者裁切高度不同，故不共用同一个盒子。
 *
 * 有意不响应 prefers-reduced-motion：波形填充不透明度只有 3.8%–6%、
 * 单层横移周期 40–76 秒，几乎不构成眩晕诱因，产品上决定在所有设备保持动态。
 * 若将来要恢复无障碍降级，在这里加回 motion-reduce:animate-none。
 */

/** 最远层：面积最大、最淡，下沿铺到页面底部 */
const BACK_WAVE = {
  height: 'h-[225px] sm:h-[270px]',
  vars: '[--wv-f:0.038] [--wv-s:0.065] dark:[--wv-f:0.075] dark:[--wv-s:0.1]',
  anim: 'animate-[waveDrift_76s_linear_infinite]',
  d: 'M0,180 C160,140 320,220 480,180 C640,140 800,220 960,180 C1120,140 1280,220 1440,180 L1440,320 L0,320 Z',
};

/** 前两层：在空隙上方收住 */
const FRONT_WAVES = [
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

/** 底部让位：页脚高度 + 1rem */
const GAP = 'calc(3rem + env(safe-area-inset-bottom) + 1rem)';

/** 一条波的填充 + 独立描边的两条 path */
function WavePaths({ d }: { d: string }) {
  return (
    <>
      <path d={d} fill="currentColor" style={{ fillOpacity: 'var(--wv-f)' }} />
      <path
        d={d.slice(0, d.indexOf(' L1440'))}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
        style={{ strokeOpacity: 'var(--wv-s)' }}
      />
    </>
  );
}

export function SiteWaves() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-10"
      style={{ '--wave-gap': GAP } as CSSProperties}
    >
      {/* 最远层：容器从页面底部起算，波峰仍在原位，下沿多出的部分由底部实色块补齐 */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 h-[calc(225px+var(--wave-gap))] overflow-hidden sm:h-[calc(270px+var(--wave-gap))]',
          // 底边不渐隐，水面要一路压到页脚；顶部仍淡出
          '[mask-image:linear-gradient(to_top,black_0%,black_55%,transparent_100%)]',
          BACK_WAVE.vars,
        )}
      >
        <div className="absolute inset-x-0 bottom-0 h-[var(--wave-gap)] bg-brand" style={{ opacity: 'var(--wv-f)' }} />
        <div
          className={cn(
            'absolute inset-x-0 bottom-[var(--wave-gap)] flex w-[200%]',
            BACK_WAVE.height,
            BACK_WAVE.anim,
          )}
        >
          {[0, 1].map((i) => (
            <svg
              key={i}
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              className="h-full w-1/2 shrink-0 text-brand"
            >
              <WavePaths d={BACK_WAVE.d} />
            </svg>
          ))}
        </div>
      </div>

      {/* 前两层：在页脚上方的空隙处渐隐收住 */}
      <div className="absolute inset-x-0 bottom-[var(--wave-gap)] h-[52dvh] max-h-[470px] overflow-hidden [mask-image:linear-gradient(to_top,transparent_0%,black_8%,black_55%,transparent_100%)]">
        {FRONT_WAVES.map((wave) => (
          <div
            key={wave.d}
            className={cn('absolute inset-x-0 bottom-0 w-[200%]', wave.className)}
          >
            {[0, 1].map((i) => (
              <svg
                key={i}
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                className="h-full w-1/2 shrink-0 text-brand"
              >
                <WavePaths d={wave.d} />
              </svg>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
