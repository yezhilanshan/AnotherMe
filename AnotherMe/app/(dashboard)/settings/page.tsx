'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  User,
  Bell,
  Monitor,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Server,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/hooks/use-theme';
import { AVATAR_OPTIONS, useUserProfileStore } from '@/lib/store/user-profile';
import { useSettingsStore } from '@/lib/store/settings';
import type { ProviderId } from '@/lib/types/provider';
import { SettingsDialog } from '@/components/settings';
import type { SettingsSection as AdvancedSettingsSection } from '@/lib/types/settings';

type SettingsSection = 'profile' | 'ai' | 'notifications' | 'appearance';

interface ProviderMap {
  [providerId: string]: {
    baseUrl?: string;
    models?: string[];
  };
}

interface ProvidersResponse {
  success: boolean;
  providers?: ProviderMap;
  tts?: ProviderMap;
  asr?: ProviderMap;
  pdf?: ProviderMap;
  image?: ProviderMap;
  video?: ProviderMap;
  webSearch?: ProviderMap;
  error?: string;
}

interface HealthResponse {
  success: boolean;
  status?: string;
  version?: string;
  error?: string;
}

interface ProfileExtras {
  grade: string;
  email: string;
  phone: string;
}

interface NotificationSettings {
  classReminder: boolean;
  messagePush: boolean;
  weeklyDigest: boolean;
  aiSuggestion: boolean;
}

const PROFILE_EXTRA_STORAGE_KEY = 'openmaic:dashboard:profile:extra';
const NOTIFICATION_STORAGE_KEY = 'openmaic:dashboard:settings:notifications';

const DEFAULT_PROFILE_EXTRAS: ProfileExtras = {
  grade: '',
  email: '',
  phone: '',
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  classReminder: true,
  messagePush: true,
  weeklyDigest: false,
  aiSuggestion: true,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function maskApiKey(apiKey: string) {
  if (!apiKey) return '未填写';
  if (apiKey.length <= 8) return '已填写';
  return `${apiKey.slice(0, 4)}********${apiKey.slice(-4)}`;
}

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const avatar = useUserProfileStore((s) => s.avatar);
  const nickname = useUserProfileStore((s) => s.nickname);
  const bio = useUserProfileStore((s) => s.bio);
  const setAvatar = useUserProfileStore((s) => s.setAvatar);
  const setNickname = useUserProfileStore((s) => s.setNickname);
  const setBio = useUserProfileStore((s) => s.setBio);

  const providerId = useSettingsStore((s) => s.providerId);
  const providersConfig = useSettingsStore((s) => s.providersConfig);
  const setProviderConfig = useSettingsStore((s) => s.setProviderConfig);
  const fetchServerProviders = useSettingsStore((s) => s.fetchServerProviders);

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedSection, setAdvancedSection] = useState<AdvancedSettingsSection>('providers');

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [serverProviders, setServerProviders] = useState<ProvidersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [warningText, setWarningText] = useState('');

  const [profileDraft, setProfileDraft] = useState({
    nickname: '',
    bio: '',
    grade: '',
    email: '',
    phone: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [notificationSaved, setNotificationSaved] = useState(false);

  const providerIds = useMemo(
    () =>
      (Object.keys(providersConfig) as ProviderId[]).sort((a, b) =>
        (providersConfig[a]?.name || a).localeCompare(providersConfig[b]?.name || b, 'zh-CN'),
      ),
    [providersConfig],
  );

  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(providerId);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [baseUrlDraft, setBaseUrlDraft] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setProfileDraft({
      nickname: nickname || '',
      bio: bio || '',
      ...loadFromStorage<ProfileExtras>(PROFILE_EXTRA_STORAGE_KEY, DEFAULT_PROFILE_EXTRAS),
    });
    setNotifications(loadFromStorage<NotificationSettings>(NOTIFICATION_STORAGE_KEY, DEFAULT_NOTIFICATIONS));
  }, [nickname, bio]);

  useEffect(() => {
    if (!providerIds.includes(selectedProviderId) && providerIds.length > 0) {
      setSelectedProviderId(providerIds[0]);
    }
  }, [providerIds, selectedProviderId]);

  useEffect(() => {
    const selected = providersConfig[selectedProviderId];
    setApiKeyDraft(selected?.apiKey || '');
    setBaseUrlDraft(selected?.baseUrl || '');
    setTestResult(null);
  }, [selectedProviderId, providersConfig]);

  useEffect(() => {
    let cancelled = false;

    async function loadBackendData() {
      try {
        const [providerResult, healthResult] = await Promise.allSettled([
          fetch('/api/server-providers', { method: 'GET', cache: 'no-store' }).then(async (resp) => {
            const payload = (await resp.json()) as ProvidersResponse;
            if (!resp.ok || !payload.success) {
              throw new Error(payload.error || '加载服务端提供商配置失败。');
            }
            return payload;
          }),
          fetch('/api/health', { method: 'GET', cache: 'no-store' }).then(async (resp) => {
            const payload = (await resp.json()) as HealthResponse;
            if (!resp.ok || !payload.success) {
              throw new Error(payload.error || '加载系统健康状态失败。');
            }
            return payload;
          }),
        ]);

        const hasProviderData = providerResult.status === 'fulfilled';
        const hasHealthData = healthResult.status === 'fulfilled';

        if (!hasProviderData && !hasHealthData) {
          throw new Error('设置加载失败：后端连接与健康状态都不可用。');
        }

        if (!cancelled) {
          if (hasProviderData) {
            setServerProviders(providerResult.value);
            void fetchServerProviders();
          }
          if (hasHealthData) {
            setHealth(healthResult.value);
          }
          if (!hasProviderData || !hasHealthData) {
            setWarningText('部分后端设置数据暂不可用，当前展示可获取的数据。');
          }
        }
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : '设置加载失败。');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBackendData();

    return () => {
      cancelled = true;
    };
  }, [fetchServerProviders]);

  const serverConfiguredCount = useMemo(
    () => providerIds.filter((id) => providersConfig[id]?.isServerConfigured).length,
    [providerIds, providersConfig],
  );

  const backendModelCount = useMemo(
    () => Object.values(serverProviders?.providers || {}).reduce((acc, item) => acc + (item.models?.length || 0), 0),
    [serverProviders],
  );

  const selectedProvider = providersConfig[selectedProviderId];

  const handleSaveProfile = () => {
    setNickname(profileDraft.nickname.trim());
    setBio(profileDraft.bio.trim());
    saveToStorage(PROFILE_EXTRA_STORAGE_KEY, {
      grade: profileDraft.grade.trim(),
      email: profileDraft.email.trim(),
      phone: profileDraft.phone.trim(),
    });
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 1500);
  };

  const handleSaveAiPreference = () => {
    if (!selectedProvider) return;
    setProviderConfig(selectedProviderId, {
      apiKey: apiKeyDraft.trim(),
      baseUrl: baseUrlDraft.trim(),
    });
    setAiSaved(true);
    window.setTimeout(() => setAiSaved(false), 1500);
  };

  const handleVerifyProvider = async () => {
    if (!selectedProvider) return;
    const modelId = selectedProvider.models?.[0]?.id;
    if (!modelId) {
      setTestResult({ ok: false, text: '当前提供商没有可测试模型。' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch('/api/verify-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKeyDraft.trim(),
          baseUrl: baseUrlDraft.trim(),
          model: `${selectedProviderId}:${modelId}`,
          providerType: selectedProvider.type,
          requiresApiKey: selectedProvider.requiresApiKey,
        }),
      });
      const payload = (await resp.json()) as {
        success: boolean;
        error?: string;
      };

      if (!resp.ok || !payload.success) {
        throw new Error(payload.error || '连接测试失败');
      }
      setTestResult({ ok: true, text: `连接成功（测试模型：${modelId}）` });
    } catch (error) {
      setTestResult({
        ok: false,
        text: error instanceof Error ? error.message : '连接测试失败',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveNotifications = () => {
    saveToStorage(NOTIFICATION_STORAGE_KEY, notifications);
    setNotificationSaved(true);
    window.setTimeout(() => setNotificationSaved(false), 1500);
  };

  const openAdvancedSettings = (section: AdvancedSettingsSection) => {
    setAdvancedSection(section);
    setAdvancedOpen(true);
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-gray-500 dark:text-gray-300">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        正在加载设置...
      </div>
    );
  }

  if (errorText) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3">{errorText}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-wide uppercase">设置</h1>
      </div>

      {warningText ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm">{warningText}</div>
      ) : null}

      <div className="bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row min-h-[600px] border border-transparent dark:border-slate-800">
        <div className="w-full md:w-64 bg-[#F4F3F0] dark:bg-slate-950 p-6 space-y-2 shrink-0 border-r border-gray-200/50 dark:border-slate-800">
          {[
            { id: 'profile' as const, label: '个人资料', icon: User },
            { id: 'ai' as const, label: 'AI 偏好', icon: Sparkles },
            { id: 'notifications' as const, label: '通知设置', icon: Bell },
            { id: 'appearance' as const, label: '外观设置', icon: Monitor },
          ].map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 font-bold uppercase tracking-wide text-xs transition-colors',
                  active
                    ? 'bg-black text-white shadow-sm dark:bg-white dark:text-slate-900'
                    : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-8">
          {activeSection === 'profile' ? (
            <div className="space-y-8">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-8">个人信息</h2>

              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden">
                  <Image
                    src={avatar || AVATAR_OPTIONS[0]}
                    alt="User"
                    width={80}
                    height={80}
                    className="h-20 w-20 object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="px-4 py-2 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                    选择头像
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-2 uppercase tracking-wide font-bold">点击下方头像即可切换</p>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {AVATAR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAvatar(option)}
                    className={cn(
                      'p-1 border-2 transition-colors',
                      avatar === option
                        ? 'border-black dark:border-white'
                        : 'border-gray-200 dark:border-slate-700',
                    )}
                  >
                    <Image src={option} alt="avatar" width={44} height={44} className="h-11 w-11 object-cover" />
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wide mb-3">姓名</label>
                  <input
                    type="text"
                    value={profileDraft.nickname}
                    onChange={(e) => setProfileDraft((prev) => ({ ...prev, nickname: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#F4F3F0] dark:bg-slate-800 border-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 rounded-none outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wide mb-3">年级</label>
                  <input
                    type="text"
                    value={profileDraft.grade}
                    onChange={(e) => setProfileDraft((prev) => ({ ...prev, grade: e.target.value }))}
                    placeholder="例如：高二"
                    className="w-full px-4 py-3 bg-[#F4F3F0] dark:bg-slate-800 border-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 rounded-none outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wide mb-3">邮箱</label>
                  <input
                    type="email"
                    value={profileDraft.email}
                    onChange={(e) => setProfileDraft((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#F4F3F0] dark:bg-slate-800 border-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 rounded-none outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wide mb-3">电话号码</label>
                  <input
                    type="tel"
                    value={profileDraft.phone}
                    onChange={(e) => setProfileDraft((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#F4F3F0] dark:bg-slate-800 border-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 rounded-none outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wide mb-3">个人简介</label>
                  <textarea
                    rows={4}
                    value={profileDraft.bio}
                    onChange={(e) => setProfileDraft((prev) => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#F4F3F0] dark:bg-slate-800 border-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 rounded-none outline-none transition-all text-sm resize-none text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="pt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="px-8 py-3 bg-[#E0573D] hover:bg-[#c94d35] text-white text-sm font-bold uppercase tracking-wide transition-all shadow-sm inline-flex items-center gap-2"
                >
                  {profileSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {profileSaved ? '已保存' : '保存更改'}
                </button>
              </div>
            </div>
          ) : null}

          {activeSection === 'ai' ? (
            <div className="space-y-7">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">AI 偏好</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#F4F3F0] dark:bg-slate-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">可配置模型提供商</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{providerIds.length}</p>
                </div>
                <div className="bg-[#F4F3F0] dark:bg-slate-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">服务端已配置</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{serverConfiguredCount}</p>
                </div>
                <div className="bg-[#F4F3F0] dark:bg-slate-800 p-4">
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">服务端模型白名单</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{backendModelCount}</p>
                </div>
              </div>

              <div className="p-4 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                  <Server className="h-4 w-4" />
                  后端状态
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  {health?.status === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  )}
                  {health?.status || 'unknown'}（版本：{health?.version || 'unknown'}）
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wide mb-3">选择模型提供商</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {providerIds.map((id) => {
                    const item = providersConfig[id];
                    const active = selectedProviderId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedProviderId(id)}
                        className={cn(
                          'text-left px-4 py-3 border transition-all',
                          active
                            ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-slate-900'
                            : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-gray-400 dark:hover:border-slate-500',
                        )}
                      >
                        <div className="text-sm font-bold">{item?.name || id}</div>
                        <div className={cn('text-xs mt-1', active ? 'text-white/90 dark:text-slate-700' : 'text-gray-500 dark:text-slate-400')}>
                          API：{maskApiKey(item?.apiKey || '')}
                        </div>
                        {item?.isServerConfigured ? (
                          <div className={cn('text-[10px] mt-2 uppercase font-bold', active ? 'text-white/90 dark:text-slate-700' : 'text-emerald-600 dark:text-emerald-400')}>
                            服务端已配置
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5 border border-gray-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                  {selectedProvider?.name || selectedProviderId} 连接设置
                </h3>

                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wide mb-3">API Key</label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyDraft}
                      onChange={(e) => setApiKeyDraft(e.target.value)}
                      placeholder="请输入你的 API Key"
                      className="w-full px-4 py-3 pr-10 bg-[#F4F3F0] dark:bg-slate-800 border-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 rounded-none outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wide mb-3">Base URL（可选）</label>
                  <input
                    type="url"
                    value={baseUrlDraft}
                    onChange={(e) => setBaseUrlDraft(e.target.value)}
                    placeholder={selectedProvider?.defaultBaseUrl || 'https://api.example.com/v1'}
                    className="w-full px-4 py-3 bg-[#F4F3F0] dark:bg-slate-800 border-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 rounded-none outline-none transition-all text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSaveAiPreference}
                    className="px-6 py-2.5 bg-[#E0573D] hover:bg-[#c94d35] text-white text-sm font-bold uppercase tracking-wide transition-all shadow-sm inline-flex items-center gap-2"
                  >
                    {aiSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {aiSaved ? '已保存' : '保存 AI 偏好'}
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyProvider}
                    disabled={testing}
                    className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white text-sm font-bold uppercase tracking-wide transition-all shadow-sm inline-flex items-center gap-2 disabled:opacity-70"
                  >
                    {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                    测试连接
                  </button>
                </div>

                {testResult ? (
                  <div
                    className={cn(
                      'px-4 py-3 text-sm border',
                      testResult.ok
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700',
                    )}
                  >
                    {testResult.text}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 border border-gray-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                  完整 API 配置入口
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  当前页只做快捷配置。若要配置 TTS / ASR / PDF / 图片 / 视频 / Web Search，请进入完整配置面板。
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { label: 'LLM', section: 'providers' as const },
                    { label: 'TTS', section: 'tts' as const },
                    { label: 'ASR', section: 'asr' as const },
                    { label: 'PDF', section: 'pdf' as const },
                    { label: 'Image', section: 'image' as const },
                    { label: 'Video', section: 'video' as const },
                    { label: 'WebSearch', section: 'web-search' as const },
                    { label: '通用设置', section: 'general' as const },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => openAdvancedSettings(item.section)}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-wide border border-gray-200 dark:border-slate-700 hover:bg-[#F4F3F0] dark:hover:bg-slate-800 text-gray-800 dark:text-gray-100 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {activeSection === 'notifications' ? (
            <div className="space-y-8">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">通知设置</h2>

              <div className="space-y-3">
                {[
                  { key: 'classReminder', label: '课程提醒', desc: '上课前提醒与学习计划到期提醒' },
                  { key: 'messagePush', label: '消息推送', desc: '消息中心会话与互动通知' },
                  { key: 'weeklyDigest', label: '每周总结', desc: '每周学习数据摘要' },
                  { key: 'aiSuggestion', label: 'AI 学习建议', desc: '根据学习轨迹给出建议任务' },
                ].map((item) => {
                  const checked = notifications[item.key as keyof NotificationSettings];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-[#F4F3F0] dark:bg-slate-800 border border-transparent"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setNotifications((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof NotificationSettings],
                          }))
                        }
                        className={cn(
                          'relative inline-flex h-7 w-12 items-center rounded-full border transition',
                          checked
                            ? 'border-[#111827] bg-[#111827]'
                            : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-block h-5 w-5 rounded-full bg-white shadow transition',
                            checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
                          )}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  className="px-8 py-3 bg-[#E0573D] hover:bg-[#c94d35] text-white text-sm font-bold uppercase tracking-wide transition-all shadow-sm inline-flex items-center gap-2"
                >
                  {notificationSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {notificationSaved ? '已保存' : '保存设置'}
                </button>
              </div>
            </div>
          ) : null}

          {activeSection === 'appearance' ? (
            <div className="space-y-8">
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">外观设置</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'light', title: '浅色模式', desc: '日间学习场景', value: 'light' as const },
                  { id: 'dark', title: '黑夜模式', desc: '夜间学习更护眼', value: 'dark' as const },
                  { id: 'system', title: '跟随系统', desc: '自动匹配系统主题', value: 'system' as const },
                ].map((mode) => {
                  const active = theme === mode.value;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTheme(mode.value)}
                      className={cn(
                        'text-left p-5 border transition-all',
                        active
                          ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-slate-900'
                          : 'border-gray-200 dark:border-slate-700 bg-[#F4F3F0] dark:bg-slate-800 text-gray-900 dark:text-slate-100',
                      )}
                    >
                      <p className="text-sm font-bold uppercase tracking-wide">{mode.title}</p>
                      <p className={cn('text-xs mt-2', active ? 'text-white/90 dark:text-slate-700' : 'text-gray-500 dark:text-slate-400')}>{mode.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 bg-[#F4F3F0] dark:bg-slate-800 border border-transparent">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">当前生效主题</p>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-2">
                  {resolvedTheme === 'dark' ? '黑夜模式已生效' : '浅色模式已生效'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className="px-8 py-3 bg-black hover:bg-gray-900 text-white text-sm font-bold uppercase tracking-wide transition-all shadow-sm inline-flex items-center gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  一键切换黑夜模式
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <SettingsDialog
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        initialSection={advancedSection}
      />
    </div>
  );
}
