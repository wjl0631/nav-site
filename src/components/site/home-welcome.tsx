/**
 * 首页「什么都还没有」时的留白页：不摆 logo、不摆按钮、不摆引导，
 * 只放一段与站名同源的文字 ——「浮生若梦」即出自李白《春夜宴从弟桃花园序》。
 * 背景水波由 (site)/layout 里的 SiteWaves 统一提供。
 */
const POEM_LINES = ['夫天地者，万物之逆旅也', '光阴者，百代之过客也'];
const POEM_CLIMAX = '而浮生若梦，为欢几何？';

export function HomeWelcome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:py-24">
      <h1 className="sr-only">浮生若梦</h1>

      <figure className="w-full max-w-[560px] text-center">
        <blockquote className="font-serif text-[16px] leading-[2.25] tracking-[0.05em] text-muted sm:text-[18px]">
          {POEM_LINES.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="mt-6 text-[21px] leading-[1.85] font-medium tracking-[0.07em] text-ink sm:mt-7 sm:text-[25px]">
            {POEM_CLIMAX}
          </p>
        </blockquote>

        <figcaption className="mt-10 text-[11.5px] tracking-[0.18em] text-muted/80 sm:mt-12 sm:text-[12px]">
          李白 · 春夜宴从弟桃花园序
        </figcaption>
      </figure>
    </div>
  );
}
