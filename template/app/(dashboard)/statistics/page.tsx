'use client';

import {
  ArrowUpRight,
  BarChart2,
  TrendingUp,
  Users,
  Clock,
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

const abilityData = [
  { metric: '概念理解', value: 78, fullMark: 100 },
  { metric: '练习表现', value: 64, fullMark: 100 },
  { metric: '实践应用', value: 71, fullMark: 100 },
  { metric: '反思复盘', value: 58, fullMark: 100 },
  { metric: '学习主动性', value: 83, fullMark: 100 },
];

const weakPointData = [
  {
    topic: '反思复盘',
    score: 58,
    priority: '高',
    suggestion: '每节课后记录 3 条复盘：学会点、卡点、改进行动。',
  },
  {
    topic: '练习表现',
    score: 64,
    priority: '中',
    suggestion: '按题型分组重做错题，连续两次正确后再升级难度。',
  },
  {
    topic: '实践应用',
    score: 71,
    priority: '中',
    suggestion: '增加互动与项目型任务，把方法迁移到新情境。',
  },
];

export default function StatisticsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-wide uppercase">数据统计</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">总学习时长</h3>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">124.5h</p>
          <div className="flex items-center gap-1 mt-2 text-[#4CAF50] text-xs font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>本月 +12.5%</span>
          </div>
        </div>

        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">完成课程数</h3>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">42</p>
          <div className="flex items-center gap-1 mt-2 text-[#4CAF50] text-xs font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>本周 +4</span>
          </div>
        </div>

        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">平均分数</h3>
            <BarChart2 className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">92%</p>
          <div className="flex items-center gap-1 mt-2 text-[#4CAF50] text-xs font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>整体 +2.1%</span>
          </div>
        </div>

        <div className="bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">解答题目数</h3>
            <ArrowUpRight className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">856</p>
          <div className="flex items-center gap-1 mt-2 text-[#4CAF50] text-xs font-bold">
            <TrendingUp className="h-3 w-3" />
            <span>本月 +124</span>
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
            <p className="text-xs text-gray-500 mt-1">基于近期学习行为生成</p>
          </div>
          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            画像更新时间：2026/04/17
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
                <RadarChart data={abilityData}>
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
              {weakPointData.map((item) => (
                <div key={item.topic} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.topic}</p>
                      <p className="text-xs text-gray-500">{item.suggestion}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${
                        item.priority === '高'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.priority}优先级
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-[#111827] transition-all duration-500"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">当前能力值：{item.score} / 100</p>
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
                <p className="text-base font-bold text-gray-900">9</p>
              </div>
              <div className="bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-500">活跃天数</p>
                <p className="text-base font-bold text-gray-900">6</p>
              </div>
              <div className="bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-500">场景总数</p>
                <p className="text-base font-bold text-gray-900">37</p>
              </div>
              <div className="bg-gray-50 p-2.5">
                <p className="text-[11px] text-gray-500">估算学习时长</p>
                <p className="text-base font-bold text-gray-900">4.9h</p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-600 leading-5">
              <p>
                近期学习重心：<span className="font-semibold text-gray-800">讲解、测验</span>
              </p>
              <p>较前 14 天增加 3 节课堂（+50.0%），学习节奏明显提升。</p>
              <p>
                建议优先提升
                <span className="font-semibold text-gray-800"> 反思复盘</span>
                ，用“错因-改法-复盘”闭环提高稳定性。
              </p>
            </div>
            <div className="mt-auto pt-4">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                <TrendingUp className="h-3 w-3" />
                学习趋势上升
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
