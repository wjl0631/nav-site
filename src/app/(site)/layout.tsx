import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { SiteWaves } from '@/components/site/site-waves';
import { SearchProvider } from '@/components/site/search-context';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SearchProvider>
      <div id="top" className="flex min-h-dvh flex-col">
        <SiteHeader />
        {/*
          isolate 让水波可以待在本层内容之下，而不至于跑到 body 背景后面去。
          pb 与 footer 的固定高度对齐（3rem + 移动端安全区），否则长页面最后一段会被页脚盖住。
        */}
        <main className="relative isolate flex flex-1 flex-col pb-[calc(3rem+env(safe-area-inset-bottom))] [&>*]:w-full">
          <SiteWaves />
          {children}
        </main>
        <SiteFooter />
      </div>
    </SearchProvider>
  );
}
