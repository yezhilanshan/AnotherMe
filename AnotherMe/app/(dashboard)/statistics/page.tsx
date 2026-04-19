'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart2,
  TrendingUp,
  Users,
  Clock,
  Loader2,
  Brain,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface ClassroomSummary {
  id: string;
  title: string;
  language?: string;
  createdAt: string;
  scenesCount: number;
  sceneTypes: string[];
}

interface ClassroomListResponse {
  success: boolean;
  classrooms?: ClassroomSummary[];
  error?: string;
}

interface AbilityScore {
  metric: string;
  value: number;
  fullMark: number;
}

interface WeakAbility extends AbilityScore {
  priority: '高' | '中' | '低';
  guidance: string;
}

const SCENE_TYPE_LABELS: Record<string, string> = {
  slide: '讲解',
  quiz: '测验',
  interactive: '互动',
  pbl: '项目',
};

const WEAK_GUIDANCE_MAP: Record<string, string> = {
  概念理解: '回看最近课堂中的“讲解”场景，先梳理核心定义和易混概念。',
  练习表现: '把测验错题按题型分组，每组至少完成 2 题同类训练。',
  实践应用: '优先完成互动或项目型课堂，重点做“会做”到“会讲清楚”的迁移。',
  反思复盘: '每节课后用 3 句话写复盘：学到什么、哪里卡住、下次怎么做。',
  学习主动性: '将本周目标拆成 3 个可执行任务，并固定每日学习时间段。',
};

function sceneTypeLabel(sceneType: string) {
  return SCENE_TYPE_LABELS[sceneType] || sceneType;
}

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export default function StatisticsPage() {
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadClassrooms() {
      try {
        const response = await fetch('/api/classroom?limit=180', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = (await response.json()) as ClassroomListResponse;
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || '加载统计数据失败。');
        }

        if (!cancelled) {
          setClassrooms(payload.classrooms || []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : '统计数据加载失败。');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadClassrooms();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const totalClassrooms = classrooms.length;
    const totalScenes = classrooms.reduce((sum, room) => sum + room.scenesCount, 0);
    const totalHours = (totalScenes * 8) / 60;
    const avgScenes = totalClassrooms ? totalScenes / totalClassrooms : 0;

    return {
      totalClassrooms,
      totalScenes,
      totalHours,
      avgScenes,
    };
  }, [classrooms]);

  const studentProfile = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const last14DaysRooms = classrooms.filter((room) => {
      const ts = new Date(room.createdAt).getTime();
      return Number.isFinite(ts) && now - ts <= 14 * oneDay;
    });
    const previous14DaysRooms = classrooms.filter((room) => {
      const ts = new Date(room.createdAt).getTime();
      return Number.isFinite(ts) && now - ts > 14 * oneDay && now - ts <= 28 * oneDay;
    });
    const analysisRooms = last14DaysRooms.length > 0 ? last14DaysRooms : classrooms;

    const sceneCounter = new Map<string, number>();
    analysisRooms.forEach((room) => {
      room.sceneTypes.forEach((sceneType) => {
        sceneCounter.set(sceneType, (sceneCounter.get(sceneType) || 0) + 1);
      });
    });

    const totalTypeCount = Math.max(
      Array.from(sceneCounter.values()).reduce((sum, count) => sum + count, 0),
      1,
    );
    const slideCount = sceneCounter.get('slide') || 0;
    const quizCount = sceneCounter.get('quiz') || 0;
    const interactiveCount = sceneCounter.get('interactive') || 0;
    const pblCount = sceneCounter.get('pbl') || 0;
    const totalRecentScenes = last14DaysRooms.reduce((sum, room) => sum + room.scenesCount, 0);
    const avgScenesPerClassroom = last14DaysRooms.length
      ? totalRecentScenes / last14DaysRooms.length
      : 0;
    const activeDays = new Set(
      last14DaysRooms.map((room) => new Date(room.createdAt).toISOString().slice(0, 10)),
    ).size;
    const trendClassrooms = last14DaysRooms.length - previous14DaysRooms.length;
    const trendPercent =
      previous14DaysRooms.length > 0
        ? (trendClassrooms / previous14DaysRooms.length) * 100
        : last14DaysRooms.length > 0
          ? 100
          : 0;

    const slideRatio = slideCount / totalTypeCount;
    const quizRatio = quizCount / totalTypeCount;
    const interactiveRatio = interactiveCount / totalTypeCount;
    const pblRatio = pblCount / totalTypeCount;
    const trendBoost = trendClassrooms > 0 ? 8 : trendClassrooms < 0 ? -6 : 0;
    const consistencyScore = (activeDays / 14) * 35;

    const abilityData: AbilityScore[] = [
      {
        metric: '概念理解',
        value: clampScore(42 + slideRatio * 28 + Math.min(totalRecentScenes * 1.5, 24), 32, 95),
        fullMark: 100,
      },
      {
        metric: '练习表现',
        value: clampScore(35 + quizRatio * 34 + Math.min(quizCount * 4, 24), 28, 94),
        fullMark: 100,
      },
      {
        metric: '实践应用',
        value: clampScore(
          33 +
            interactiveRatio * 22 +
            pblRatio * 26 +
            Math.min((interactiveCount + pblCount) * 4, 22),
          25,
          94,
        ),
        fullMark: 100,
      },
      {
        metric: '反思复盘',
        value: clampScore(30 + consistencyScore + Math.min(avgScenesPerClassroom * 5, 20), 24, 96),
        fullMark: 100,
      },
      {
        metric: '学习主动性',
        value: clampScore(
          36 +
            Math.min(last14DaysRooms.length * 3.8, 26) +
            Math.min(activeDays * 1.8, 20) +
            trendBoost,
          25,
          98,
        ),
        fullMark: 100,
      },
    ];

    const weakAbilities: WeakAbility[] = [...abilityData]
      .sort((a, b) => a.value - b.value)
      .slice(0, 3)
      .map((ability) => {
        const gap = 100 - ability.value;
        const priority: '高' | '中' | '低' = gap >= 30 ? '高' : gap >= 18 ? '中' : '低';
        return {
          ...ability,
          priority,
          guidance: WEAK_GUIDANCE_MAP[ability.metric] || '建议通过针对性练习持续巩固。',
        };
      });

    const topFocusTopics = Array.from(sceneCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([sceneType]) => sceneTypeLabel(sceneType));

    const trendText =
      previous14DaysRooms.length === 0
        ? '前 14 天样本不足，当前处于学习积累期。'
        : `较前 14 天${trendClassrooms >= 0 ? '增加' : '减少'}${Math.abs(trendClassrooms)}节课堂（${trendPercent >= 0 ? '+' : ''}${trendPercent.toFixed(1)}%）。`;

    return {
      abilityData,
      weakAbilities,
      activeDays,
      recentClassroomCount: last14DaysRooms.length,
      recentSceneCount: totalRecentScenes,
      recentStudyHours: (totalRecentScenes * 8) / 60,
      trendClassrooms,
      trendText,
      topFocusText: topFocusTopics.length ? topFocusTopics.join('、') : '基础巩固',
    };
  }, [classrooms]);

  const profileUpdatedAt = useMemo(() => {
    const latestTimestamp = classrooms.reduce((latest, room) => {
      const ts = new Date(room.createdAt).getTime();
      if (!Number.isFinite(ts)) return latest;
      return Math.max(latest, ts);
    }, 0);
    return latestTimestamp ? new Date(latestTimestamp).toLocaleDateString('zh-CN') : '暂无数据';
  }, [classrooms]);

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        正在加载统计数据...
      </div>
    );
  }

  if (errorText) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3">{errorText}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-wide uppercase">数据统计</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">累计课堂时长</h3>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.totalHours.toFixed(1)}h</p>
          <div className="flex items-center gap-1 mt-2 text-[#4CAF50] text-xs font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>基于真实课堂场景估算</span>
          </div>
        </div>

        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">课堂总数</h3>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.totalClassrooms}</p>
          <div className="flex items-center gap-1 mt-2 text-[#4CAF50] text-xs font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>来自 /api/classroom</span>
          </div>
        </div>

        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">平均场景数</h3>
            <BarChart2 className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.avgScenes.toFixed(1)}</p>
          <div className="flex items-center gap-1 mt-2 text-[#4CAF50] text-xs font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>每节课堂平均场景</span>
          </div>
        </div>

        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">总场景数</h3>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.totalScenes}</p>
          <div className="flex items-center gap-1 mt-2 text-[#4CAF50] text-xs font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>讲解 + 测验 + 互动 + 项目</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-wide flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#E0573D]" />
              学生画像
            </h2>
            <p className="text-xs text-gray-500 mt-1">基于最近 14 天课堂行为自动生成</p>
          </div>
          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            画像更新时间：{profileUpdatedAt}
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">能力雷达图</h3>
              <span className="text-xs text-gray-500">满分 100</span>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={studentProfile.abilityData}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#374151', fontSize: 12 }} />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tickCount={6}
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <Radar
                    name="能力值"
                    dataKey="value"
                    stroke="#E0573D"
                    fill="#E0573D"
                    fillOpacity={0.28}
                    strokeWidth={2}
                  />
                  <RechartsTooltip
                    formatter={(value) => [`${value} 分`, '能力值']}
                    contentStyle={{
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#E0573D]" />
              薄弱点分析
            </h3>
            <div className="space-y-4">
              {studentProfile.weakAbilities.map((item) => (
                <div key={item.metric} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.metric}</p>
                      <p className="text-xs text-gray-500">{item.guidance}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${
                        item.priority === '高'
                          ? 'bg-red-100 text-red-700'
                          : item.priority === '中'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.priority}优先级
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-[#111827] transition-all duration-500"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">当前能力值：{item.value} / 100</p>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-3 border border-gray-100 p-4 flex flex-col">
            <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#4A6FA5]" />
              近期学习情况总结
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-500">近14天课堂</p>
                <p className="text-base font-bold text-gray-900">{studentProfile.recentClassroomCount}</p>
              </div>
              <div className="bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-500">活跃天数</p>
                <p className="text-base font-bold text-gray-900">{studentProfile.activeDays}</p>
              </div>
              <div className="bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-500">场景总数</p>
                <p className="text-base font-bold text-gray-900">{studentProfile.recentSceneCount}</p>
              </div>
              <div className="bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-500">估算学习时长</p>
                <p className="text-base font-bold text-gray-900">
                  {studentProfile.recentStudyHours.toFixed(1)}h
                </p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-600 leading-5">
              <p>
                近期学习重心：<span className="font-semibold text-gray-800">{studentProfile.topFocusText}</span>
              </p>
              <p>{studentProfile.trendText}</p>
              <p>
                当前建议优先提升
                <span className="font-semibold text-gray-800">
                  {' '}
                  {studentProfile.weakAbilities[0]?.metric || '概念理解'}
                </span>
                ，先做小步快跑式练习，再逐步提高题目复杂度。
              </p>
            </div>
            <div className="mt-auto pt-4">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                  studentProfile.trendClassrooms > 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : studentProfile.trendClassrooms < 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                学习趋势
                {studentProfile.trendClassrooms > 0
                  ? '上升'
                  : studentProfile.trendClassrooms < 0
                    ? '需关注'
                    : '平稳'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
