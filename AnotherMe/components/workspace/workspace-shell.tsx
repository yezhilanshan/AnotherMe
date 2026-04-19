'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKSPACE_NAV_ITEMS } from '@/lib/workspace/navigation';

interface WorkspaceShellProps {
  children: React.ReactNode;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeItem = WORKSPACE_NAV_ITEMS.find((item) => pathname.startsWith(item.href));

  return (
    <>
      <div className="mb-8 px-2">
        <div className="mb-4 flex items-center gap-3">
          <div className="workspace-logo-badge workspace-cn-serif text-base font-semibold">A</div>
          <div>
            <p className="workspace-brand">学习站</p>
            <p className="mt-1 text-xs text-[#8a7f73]">课程、任务与复习一体化</p>
          </div>
        </div>

        <div className="border-l-2 border-[#cab9a6] pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9b8d80]">
            当前场景
          </p>
          <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[#241d18]">
            {activeItem?.title ?? '学习站'}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#807366]">
            {activeItem?.subtitle ?? '把今天最重要的学习动作推进下去。'}
          </p>
        </div>
      </div>

      <div className="mb-3 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#a49486]">
          Workspace
        </p>
      </div>

      <nav className="space-y-2.5">
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
                <span className="block truncate text-sm font-semibold">{item.title}</span>
                <span className="mt-1 block truncate text-xs text-[#9a8c7d]">{item.subtitle}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#b9ab9c]" />
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pt-6">
        <p className="text-xs leading-6 text-[#877a6d]">今天也保持学习节奏，完成最关键的一步。</p>
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

  const headerTitle = useMemo(() => {
    if (pathname.startsWith('/workspace/classroom/')) {
      return '课堂播放';
    }

    if (
      pathname.startsWith('/generation-preview') ||
      pathname.startsWith('/workspace/generation-preview')
    ) {
      return '正在准备内容';
    }

    return activeItem?.title ?? '学习站';
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9b8d80]">
                Learning Dashboard
              </p>
              <p className="workspace-topbar-title">{headerTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-[#8c8075]">{today}</p>
          </div>
        </header>

        <section className="workspace-content workspace-page">{children}</section>
      </main>
    </div>
  );
}
