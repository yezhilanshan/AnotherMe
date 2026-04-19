import {
  BookOpenCheck,
  Camera,
  LayoutDashboard,
  ListChecks,
  NotebookTabs,
  Settings2,
  type LucideIcon,
} from 'lucide-react';

export interface WorkspaceNavItem {
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
}

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  {
    title: '学习课堂',
    subtitle: '快速生成本节学习内容',
    href: '/workspace/interactive',
    icon: LayoutDashboard,
  },
  {
    title: '题目视频',
    subtitle: '一道题，一段讲解',
    href: '/workspace/problem-video',
    icon: Camera,
  },
  {
    title: '错题本',
    subtitle: '把错题变成会做题',
    href: '/workspace/notebook',
    icon: NotebookTabs,
  },
  {
    title: '课堂回放',
    subtitle: '复习以前学过的内容',
    href: '/workspace/review',
    icon: BookOpenCheck,
  },
  {
    title: '今日计划',
    subtitle: '安排今天要完成的任务',
    href: '/workspace/plan',
    icon: ListChecks,
  },
  {
    title: '学习设置',
    subtitle: '调整界面和功能偏好',
    href: '/workspace/settings',
    icon: Settings2,
  },
];
