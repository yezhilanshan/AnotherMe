'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Camera,
  Settings,
  LogOut,
  GraduationCap,
  BarChart2,
  Bell,
  Headphones,
  MessageSquare,
  Library
} from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { name: '学习概览', href: '/', icon: LayoutDashboard },
  { name: '我的课程', href: '/classes', icon: Library },
  { name: '创建课堂', href: '/create-class', icon: BookOpen, badge: '新' },
  { name: '拍题视频', href: '/photo-to-video', icon: Camera },
  { name: '数据统计', href: '/statistics', icon: BarChart2 },
  { name: '消息中心', href: '/messages', icon: MessageSquare },
  { name: '系统设置', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 border-r border-gray-200/50">
      <div className="h-24 flex items-center px-8">
        <div className="flex items-center gap-3 text-gray-900">
          <div className="h-8 w-8 bg-black rounded-lg flex items-center justify-center text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-wider uppercase">镜我</span>
        </div>
      </div>

      <div className="flex-1 py-4 px-6 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-black text-white font-medium shadow-md'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-700'
                  )}
                />
                <span className="text-sm">{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#88DBCB] text-teal-900 rounded-md">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <Link href="/ai-tutor" className="mt-8 px-4 flex items-center justify-between text-sm text-gray-500 hover:text-gray-900 transition-colors group">
          <div className="flex items-center gap-4">
            <Headphones className="h-5 w-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
            <span>AI 导师</span>
          </div>
        </Link>

        <button className="mt-4 flex items-center gap-4 px-4 py-3 w-full text-gray-500 hover:text-gray-900 transition-colors group text-sm">
          <LogOut className="h-5 w-5 text-gray-400 group-hover:text-gray-700" />
          <span>退出登录</span>
        </button>
      </div>

      <div className="p-8 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-full overflow-hidden mb-3 bg-gray-200">
          <Image src="https://picsum.photos/seed/user/100/100" alt="User" width={48} height={48} referrerPolicy="no-referrer" />
        </div>
        <p className="text-sm font-bold text-gray-900">张同学</p>
        <p className="text-xs text-gray-500 mt-0.5">zhang@example.com</p>
      </div>
    </aside>
  );
}
