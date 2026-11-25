import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || '浮生若梦';
const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '精选优质网站与深度文章，一页直达';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['导航站', '网址导航', '资源导航', '工具集合', '技术文章'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'zh_CN',
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  // 单一值即可，实际颜色由首屏脚本按当前主题改写（见 themeScript）
  themeColor: '#f6f7f9',
};

/**
 * 首屏着色的内联脚本：先看 localStorage 记忆，没有则跟随系统。
 * 必须在 body 内容之前同步执行，否则会先闪一帧浅色。
 * 同时把 apply 挂到 window，供 ThemeToggle 复用（含移动端地址栏配色）。
 */
const themeScript = `(function(){
  function apply(d){
    var e=document.documentElement;
    // 切换这一下先掐掉过渡，让所有控件的颜色与背景同一帧到位（见 globals.css .theme-switching）
    e.classList.add('theme-switching');
    e.classList.toggle('dark',d);
    e.style.colorScheme=d?'dark':'light';
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute('content',d?'#0b0e13':'#f6f7f9');
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        e.classList.remove('theme-switching');
      });
    });
  }
  window.__navApplyTheme=apply;
  try{
    var s=localStorage.getItem('theme');
    var mq=window.matchMedia('(prefers-color-scheme: dark)');
    apply(s?s==='dark':mq.matches);
    mq.addEventListener('change',function(ev){
      if(!localStorage.getItem('theme'))apply(ev.matches);
    });
  }catch(_){}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
