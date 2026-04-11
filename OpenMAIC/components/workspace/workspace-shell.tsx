'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKSPACE_NAV_ITEMS } from '@/lib/workspace/navigation';

interface WorkspaceShellProps {
  children: React.ReactNode;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="workspace-logo-badge workspace-cn-serif text-base font-semibold">A</div>
        <div>
          <p className="workspace-brand">AnotherMe 学习工作台</p>
          <p className="workspace-brand-sub">面向中文课堂的简约创作界面</p>
        </div>
      </div>

      <nav className="space-y-2">
        {WORKSPACE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn('workspace-nav-item', isActive && 'workspace-nav-item-active')}
            >
              <span className="workspace-nav-icon">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="block truncate text-xs text-[#8a7b6d]">{item.subtitle}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#b3a596]" />
            </Link>
          );
        })}
      </nav>

      <div className="workspace-side-card mt-6">
        <p className="text-xs tracking-[0.2em] text-[#8b7864]">今日建议</p>
        <p className="mt-2 text-sm font-semibold text-[#312821]">先定目标，再生成结构</p>
        <p className="mt-1 text-xs leading-6 text-[#786c61]">
          主题写得越具体，后续课堂、视频和错题沉淀就越顺手。
        </p>
      </div>
    </>
  );
}

export function WorkspaceShell({ children }: WorkspaceShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const activeItem = useMemo(() => {
    return WORKSPACE_NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  }, [pathname]);

  const headerCopy = useMemo(() => {
    if (pathname.startsWith('/workspace/classroom/')) {
      return {
        title: '课堂回放',
        subtitle: '在工作台内继续沉浸式浏览与全屏播放',
      };
    }

    if (
      pathname.startsWith('/generation-preview') ||
      pathname.startsWith('/workspace/generation-preview')
    ) {
      return {
        title: '课堂生成中',
        subtitle: '正在整理结构、内容与课堂动作，请稍候片刻',
      };
    }

    return {
      title: activeItem?.title ?? '学习工作台',
      subtitle: activeItem?.subtitle ?? '用统一的中文界面管理生成、复盘与设置',
    };
  }, [activeItem, pathname]);

  const today = useMemo(() => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(new Date());
  }, []);

  return (
    <div className="workspace-app workspace-cn-font">
      <div className="workspace-backdrop" aria-hidden="true" />

      <aside className="workspace-sidebar hidden lg:flex lg:w-[282px] lg:flex-col">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="workspace-sidebar fixed inset-y-0 left-0 z-50 w-[290px] lg:hidden"
          >
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#e4d8ca] bg-[#fffaf4]"
              aria-label="关闭菜单"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e4d8ca] bg-[#fff9f2] lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="打开菜单"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="workspace-topbar-copy">
              <p className="workspace-topbar-title">{headerCopy.title}</p>
              <p className="workspace-topbar-subtitle">{headerCopy.subtitle}</p>
            </div>
          </div>

          <div className="workspace-topbar-badge">
            <CalendarDays className="h-3.5 w-3.5" />
            {today}
          </div>
        </header>

        <section className="workspace-content workspace-page">{children}</section>
      </main>
    </div>
  );
}
