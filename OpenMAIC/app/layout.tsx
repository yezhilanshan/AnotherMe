import type { Metadata } from 'next';
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import './globals.css';
import 'animate.css';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/lib/hooks/use-theme';
import { I18nProvider } from '@/lib/hooks/use-i18n';
import { Toaster } from '@/components/ui/sonner';
import { ServerProvidersInit } from '@/components/server-providers-init';

const notoSansSc = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-sans-workspace',
  weight: ['400', '500', '600', '700'],
});

const notoSerifSc = Noto_Serif_SC({
  subsets: ['latin'],
  variable: '--font-serif-workspace',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'AnotherMe 学习工作台',
  description: '面向中文学习场景的 AI 课程生成与复盘工作台。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSansSc.variable} ${notoSerifSc.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <I18nProvider>
            <ServerProvidersInit />
            {children}
            <Toaster position="top-center" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
