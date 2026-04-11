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
    title: '互动课堂',
    subtitle: '从主题直接生成可上课的内容',
    href: '/workspace/interactive',
    icon: LayoutDashboard,
  },
  {
    title: '题目视频',
    subtitle: '把一道题整理成讲解短视频',
    href: '/workspace/problem-video',
    icon: Camera,
  },
  {
    title: '错题本',
    subtitle: '沉淀题目、讲解与标签',
    href: '/workspace/notebook',
    icon: NotebookTabs,
  },
  {
    title: '课堂回看',
    subtitle: '快速回放历史课程主题',
    href: '/workspace/review',
    icon: BookOpenCheck,
  },
  {
    title: '学习计划',
    subtitle: '安排今日任务与每周节奏',
    href: '/workspace/plan',
    icon: ListChecks,
  },
  {
    title: '设置中心',
    subtitle: '管理模型、语音与偏好',
    href: '/workspace/settings',
    icon: Settings2,
  },
];
