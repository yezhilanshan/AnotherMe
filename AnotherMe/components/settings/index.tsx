'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  Trash2,
  Box,
  Settings,
  CheckCircle2,
  XCircle,
  FileText,
  Image as ImageIcon,
  Film,
  Search,
  Volume2,
  Mic,
} from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useSettingsStore } from '@/lib/store/settings';
import { toast } from 'sonner';
import { type ProviderId } from '@/lib/ai/providers';
import { PROVIDERS } from '@/lib/ai/providers';
import { cn } from '@/lib/utils';
import { getProviderTypeLabel } from './utils';
import { ProviderList } from './provider-list';
import { ProviderConfigPanel } from './provider-config-panel';
import { PDFSettings } from './pdf-settings';
import { PDF_PROVIDERS } from '@/lib/pdf/constants';
import type { PDFProviderId } from '@/lib/pdf/types';
import { ImageSettings } from './image-settings';
import { IMAGE_PROVIDERS } from '@/lib/media/image-providers';
import type { ImageProviderId } from '@/lib/media/types';
import { VideoSettings } from './video-settings';
import { VIDEO_PROVIDERS } from '@/lib/media/video-providers';
import type { VideoProviderId } from '@/lib/media/types';
import { TTSSettings } from './tts-settings';
import { TTS_PROVIDERS } from '@/lib/audio/constants';
import type { TTSProviderId } from '@/lib/audio/types';
import { ASRSettings } from './asr-settings';
import { ASR_PROVIDERS } from '@/lib/audio/constants';
import type { ASRProviderId } from '@/lib/audio/types';
import { WebSearchSettings } from './web-search-settings';
import { WEB_SEARCH_PROVIDERS } from '@/lib/web-search/constants';
import type { WebSearchProviderId } from '@/lib/web-search/types';
import { GeneralSettings } from './general-settings';
import { ModelEditDialog } from './model-edit-dialog';
import { AddProviderDialog, type NewProviderData } from './add-provider-dialog';
import type { SettingsSection, EditingModel } from '@/lib/types/settings';

// ─── Provider List Column (reusable) ───
function ProviderListColumn<T extends string>({
  providers,
  configs,
  selectedId,
  onSelect,
  width,
  t,
}: {
  providers: Array<{ id: T; name: string; icon?: string }>;
  configs: Record<string, { isServerConfigured?: boolean }>;
  selectedId: T;
  onSelect: (id: T) => void;
  width: number;
  t: (key: string) => string;
}) {
  return (
    <div
      className="flex-shrink-0 flex flex-col border-r border-[rgba(133,88,34,0.12)] bg-[rgba(250,246,239,0.72)]"
      style={{ width }}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelect(provider.id)}
            className={cn(
              'w-full flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-200',
              selectedId === provider.id
                ? 'border-[rgba(151,118,75,0.32)] bg-white/92 text-foreground shadow-[0_14px_34px_rgba(102,72,28,0.08)]'
                : 'border-transparent bg-transparent text-foreground/86 hover:border-[rgba(151,118,75,0.16)] hover:bg-white/72',
            )}
          >
            {provider.icon ? (
              <img
                src={provider.icon}
                alt={provider.name}
                className="h-5 w-5 rounded-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(151,118,75,0.14)] bg-[rgba(255,255,255,0.88)]">
                <Box className="h-4 w-4 text-[rgba(120,90,54,0.82)]" />
              </span>
            )}
            <span className="flex-1 truncate text-sm font-medium">{provider.name}</span>
            {configs[provider.id]?.isServerConfigured && (
              <span className="shrink-0 rounded-full border border-[rgba(151,118,75,0.18)] bg-[rgba(245,238,226,0.95)] px-2 py-0.5 text-[10px] leading-4 text-[rgba(120,90,54,0.9)]">
                {t('settings.serverConfigured')}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Helper: get TTS/ASR provider display name ───
function getTTSProviderName(providerId: TTSProviderId, t: (key: string) => string): string {
  const names: Record<TTSProviderId, string> = {
    'openai-tts': t('settings.providerOpenAITTS'),
    'azure-tts': t('settings.providerAzureTTS'),
    'glm-tts': t('settings.providerGLMTTS'),
    'qwen-tts': t('settings.providerQwenTTS'),
    'doubao-tts': t('settings.providerDoubaoTTS'),
    'elevenlabs-tts': t('settings.providerElevenLabsTTS'),
    'minimax-tts': t('settings.providerMiniMaxTTS'),
    'browser-native-tts': t('settings.providerBrowserNativeTTS'),
  };
  return names[providerId];
}

function getASRProviderName(providerId: ASRProviderId, t: (key: string) => string): string {
  const names: Record<ASRProviderId, string> = {
    'openai-whisper': t('settings.providerOpenAIWhisper'),
    'browser-native': t('settings.providerBrowserNative'),
    'qwen-asr': t('settings.providerQwenASR'),
  };
  return names[providerId];
}

// ─── Image/Video provider name helpers ───
const IMAGE_PROVIDER_NAMES: Record<ImageProviderId, string> = {
  seedream: 'providerSeedream',
  'qwen-image': 'providerQwenImage',
  'nano-banana': 'providerNanoBanana',
  'minimax-image': 'providerMiniMaxImage',
  'grok-image': 'providerGrokImage',
  'liblib-image': 'providerLibLibImage',
};

const IMAGE_PROVIDER_ICONS: Record<ImageProviderId, string> = {
  seedream: '/logos/doubao.svg',
  'qwen-image': '/logos/bailian.svg',
  'nano-banana': '/logos/gemini.svg',
  'minimax-image': '/logos/minimax.svg',
  'grok-image': '/logos/grok.svg',
  'liblib-image': '/logos/liblib.svg',
};

const VIDEO_PROVIDER_NAMES: Record<VideoProviderId, string> = {
  seedance: 'providerSeedance',
  kling: 'providerKling',
  veo: 'providerVeo',
  sora: 'providerSora',
  'minimax-video': 'providerMiniMaxVideo',
  'grok-video': 'providerGrokVideo',
};

const VIDEO_PROVIDER_ICONS: Record<VideoProviderId, string> = {
  seedance: '/logos/doubao.svg',
  kling: '/logos/kling.svg',
  veo: '/logos/gemini.svg',
  sora: '/logos/openai.svg',
  'minimax-video': '/logos/minimax.svg',
  'grok-video': '/logos/grok.svg',
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: SettingsSection;
}

export function SettingsDialog({ open, onOpenChange, initialSection }: SettingsDialogProps) {
  const { t } = useI18n();

  // Get settings from store
  const providerId = useSettingsStore((state) => state.providerId);
  const _modelId = useSettingsStore((state) => state.modelId);
  const providersConfig = useSettingsStore((state) => state.providersConfig);
  const pdfProviderId = useSettingsStore((state) => state.pdfProviderId);
  const pdfProvidersConfig = useSettingsStore((state) => state.pdfProvidersConfig);
  const webSearchProviderId = useSettingsStore((state) => state.webSearchProviderId);
  const webSearchProvidersConfig = useSettingsStore((state) => state.webSearchProvidersConfig);
  const imageProviderId = useSettingsStore((state) => state.imageProviderId);
  const imageProvidersConfig = useSettingsStore((state) => state.imageProvidersConfig);
  const videoProviderId = useSettingsStore((state) => state.videoProviderId);
  const videoProvidersConfig = useSettingsStore((state) => state.videoProvidersConfig);
  const ttsProviderId = useSettingsStore((state) => state.ttsProviderId);
  const ttsProvidersConfig = useSettingsStore((state) => state.ttsProvidersConfig);
  const asrProviderId = useSettingsStore((state) => state.asrProviderId);
  const asrProvidersConfig = useSettingsStore((state) => state.asrProvidersConfig);

  // Store actions
  const setModel = useSettingsStore((state) => state.setModel);
  const setProviderConfig = useSettingsStore((state) => state.setProviderConfig);
  const setProvidersConfig = useSettingsStore((state) => state.setProvidersConfig);
  const setTTSProvider = useSettingsStore((state) => state.setTTSProvider);
  const setASRProvider = useSettingsStore((state) => state.setASRProvider);

  // Navigation
  const [activeSection, setActiveSection] = useState<SettingsSection>('providers');
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(providerId);
  const [selectedPdfProviderId, setSelectedPdfProviderId] = useState<PDFProviderId>(pdfProviderId);
  const [selectedWebSearchProviderId, setSelectedWebSearchProviderId] =
    useState<WebSearchProviderId>(webSearchProviderId);
  const [selectedImageProviderId, setSelectedImageProviderId] =
    useState<ImageProviderId>(imageProviderId);
  const [selectedVideoProviderId, setSelectedVideoProviderId] =
    useState<VideoProviderId>(videoProviderId);
  // Navigate to initialSection when dialog opens
  useEffect(() => {
    if (open && initialSection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync section from prop when dialog opens
      setActiveSection(initialSection);
    }
  }, [open, initialSection]);

  // Model editing state
  const [editingModel, setEditingModel] = useState<EditingModel | null>(null);
  const [showModelDialog, setShowModelDialog] = useState(false);

  // Provider deletion confirmation
  const [providerToDelete, setProviderToDelete] = useState<ProviderId | null>(null);

  // Add provider dialog
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Resizable column widths
  const [sidebarWidth, setSidebarWidth] = useState(192);
  const [providerListWidth, setProviderListWidth] = useState(192);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{
    target: 'sidebar' | 'providerList';
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, target: 'sidebar' | 'providerList') => {
      e.preventDefault();
      const startWidth = target === 'sidebar' ? sidebarWidth : providerListWidth;
      resizeRef.current = { target, startX: e.clientX, startWidth };
      setIsResizing(true);
    },
    [sidebarWidth, providerListWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const { target, startX, startWidth } = resizeRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(120, Math.min(360, startWidth + delta));
      if (target === 'sidebar') {
        setSidebarWidth(newWidth);
      } else {
        setProviderListWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const handleSave = () => {
    onOpenChange(false);
  };

  const handleProviderSelect = (pid: ProviderId) => {
    setSelectedProviderId(pid);
  };

  const handleProviderConfigChange = (
    pid: ProviderId,
    apiKey: string,
    baseUrl: string,
    requiresApiKey: boolean,
  ) => {
    setProviderConfig(pid, {
      apiKey,
      baseUrl,
      requiresApiKey,
    });
  };

  const handleProviderConfigSave = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const selectedProvider = providersConfig[selectedProviderId]
    ? {
        id: selectedProviderId,
        name: providersConfig[selectedProviderId].name,
        type: providersConfig[selectedProviderId].type,
        defaultBaseUrl: providersConfig[selectedProviderId].defaultBaseUrl,
        icon: providersConfig[selectedProviderId].icon,
        requiresApiKey: providersConfig[selectedProviderId].requiresApiKey,
        models: providersConfig[selectedProviderId].models,
      }
    : undefined;

  // Handle model editing
  const handleEditModel = (pid: ProviderId, modelIndex: number) => {
    const allModels = providersConfig[pid]?.models || [];
    setEditingModel({
      providerId: pid,
      modelIndex,
      model: { ...allModels[modelIndex] },
    });
    setShowModelDialog(true);
  };

  const handleAddModel = () => {
    setEditingModel({
      providerId: selectedProviderId,
      modelIndex: null,
      model: {
        id: '',
        name: '',
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
        },
      },
    });
    setShowModelDialog(true);
  };

  const handleDeleteModel = (pid: ProviderId, modelIndex: number) => {
    const currentModels = providersConfig[pid]?.models || [];
    const newModels = currentModels.filter((_, i) => i !== modelIndex);
    setProviderConfig(pid, { models: newModels });
  };

  const handleAutoSaveModel = () => {
    if (!editingModel) return;
    const { providerId: pid, modelIndex, model } = editingModel;
    if (!model.id.trim()) return;
    const currentModels = providersConfig[pid]?.models || [];
    let newModels: typeof currentModels;
    let newModelIndex = modelIndex;

    if (modelIndex === null) {
      const existingIndex = currentModels.findIndex((m) => m.id === model.id);
      if (existingIndex >= 0) {
        newModels = [...currentModels];
        newModels[existingIndex] = model;
        newModelIndex = existingIndex;
      } else {
        newModels = [...currentModels, model];
        newModelIndex = newModels.length - 1;
      }
      setProviderConfig(pid, { models: newModels });
      setEditingModel({ ...editingModel, modelIndex: newModelIndex });
    } else {
      newModels = [...currentModels];
      newModels[modelIndex] = model;
      setProviderConfig(pid, { models: newModels });
    }
  };

  const handleSaveModel = () => {
    if (!editingModel) return;
    const { providerId: pid, modelIndex, model } = editingModel;
    if (!model.id.trim()) {
      toast.error(t('settings.modelIdRequired'));
      return;
    }
    const currentModels = providersConfig[pid]?.models || [];
    let newModels: typeof currentModels;
    if (modelIndex === null) {
      newModels = [...currentModels, model];
    } else {
      newModels = [...currentModels];
      newModels[modelIndex] = model;
    }
    setProviderConfig(pid, { models: newModels });
    setShowModelDialog(false);
    setEditingModel(null);
  };

  // Handle provider management
  const handleAddProvider = (providerData: NewProviderData) => {
    if (!providerData.name.trim()) {
      toast.error(t('settings.providerNameRequired'));
      return;
    }
    const newProviderId = `custom-${Date.now()}` as ProviderId;
    const updatedConfig = {
      ...providersConfig,
      [newProviderId]: {
        apiKey: '',
        baseUrl: '',
        models: [],
        name: providerData.name,
        type: providerData.type,
        defaultBaseUrl: providerData.baseUrl || undefined,
        icon: providerData.icon || undefined,
        requiresApiKey: providerData.requiresApiKey,
        isBuiltIn: false,
      },
    };
    setProvidersConfig(updatedConfig);
    setShowAddProviderDialog(false);
    setSelectedProviderId(newProviderId);
  };

  const handleDeleteProvider = (pid: ProviderId) => {
    if (providersConfig[pid]?.isBuiltIn) {
      toast.error(t('settings.cannotDeleteBuiltIn'));
      return;
    }
    setProviderToDelete(pid);
  };

  const confirmDeleteProvider = () => {
    if (!providerToDelete) return;
    const pid = providerToDelete;
    const updatedConfig = { ...providersConfig };
    delete updatedConfig[pid];
    setProvidersConfig(updatedConfig);
    if (selectedProviderId === pid) {
      const firstRemainingPid = Object.keys(updatedConfig)[0] as ProviderId | undefined;
      setSelectedProviderId(firstRemainingPid || 'openai');
    }
    if (providerId === pid) {
      const firstRemainingPid = Object.keys(updatedConfig)[0] as ProviderId | undefined;
      const firstModel = firstRemainingPid
        ? updatedConfig[firstRemainingPid]?.serverModels?.[0] ||
          updatedConfig[firstRemainingPid]?.models?.[0]?.id
        : undefined;
      if (firstRemainingPid && firstModel) {
        setModel(firstRemainingPid, firstModel);
      } else {
        setModel('openai' as ProviderId, 'gpt-4o-mini');
      }
    }
    setProviderToDelete(null);
  };

  const handleResetProvider = (pid: ProviderId) => {
    const provider = PROVIDERS[pid];
    if (!provider) return;
    setProviderConfig(pid, { models: [...provider.models] });
    toast.success(t('settings.resetSuccess'));
  };

  // Get all providers from providersConfig
  const allProviders = Object.entries(providersConfig).map(([id, config]) => ({
    id: id as ProviderId,
    name: config.name,
    type: config.type,
    defaultBaseUrl: config.defaultBaseUrl,
    icon: config.icon,
    requiresApiKey: config.requiresApiKey,
    models: config.models,
    isServerConfigured: config.isServerConfigured,
  }));

  // Sections that show a provider list column
  const _hasProviderList = [
    'providers',
    'pdf',
    'web-search',
    'image',
    'video',
    'tts',
    'asr',
  ].includes(activeSection);

  const sectionItems: Array<{
    id: SettingsSection;
    label: string;
    description: string;
    icon: typeof Box;
  }> = [
    {
      id: 'providers',
      label: t('settings.providers'),
      description: '统一管理语言模型与供应商接入。',
      icon: Box,
    },
    {
      id: 'image',
      label: t('settings.imageSettings'),
      description: '控制图片生成模型与默认能力。',
      icon: ImageIcon,
    },
    {
      id: 'video',
      label: t('settings.videoSettings'),
      description: '配置视频生成链路与输出策略。',
      icon: Film,
    },
    {
      id: 'tts',
      label: t('settings.ttsSettings'),
      description: '设置语音合成服务与发音风格。',
      icon: Volume2,
    },
    {
      id: 'asr',
      label: t('settings.asrSettings'),
      description: '管理语音识别与转写能力。',
      icon: Mic,
    },
    {
      id: 'pdf',
      label: t('settings.pdfSettings'),
      description: '定义 PDF 解析与图文抽取来源。',
      icon: FileText,
    },
    {
      id: 'web-search',
      label: t('settings.webSearchSettings'),
      description: '设置联网检索供应商与调用方式。',
      icon: Search,
    },
    {
      id: 'general',
      label: t('settings.systemSettings'),
      description: '维护全局行为、语言与系统偏好。',
      icon: Settings,
    },
  ];

  const activeSectionMeta = sectionItems.find((item) => item.id === activeSection);

  // Get header content based on section
  const getHeaderContent = () => {
    switch (activeSection) {
      case 'general':
        return <h2 className="text-lg font-semibold">{t('settings.systemSettings')}</h2>;
      case 'providers':
        if (selectedProvider) {
          return (
            <>
              {selectedProvider.icon ? (
                <img
                  src={selectedProvider.icon}
                  alt={selectedProvider.name}
                  className="w-8 h-8 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Box className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <h2 className="text-lg font-semibold">{selectedProvider.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {getProviderTypeLabel(selectedProvider.type, t)}
                </p>
              </div>
            </>
          );
        }
        return null;
      case 'pdf': {
        const pdfProvider = PDF_PROVIDERS[selectedPdfProviderId];
        if (!pdfProvider) return null;
        return (
          <>
            {pdfProvider.icon ? (
              <img
                src={pdfProvider.icon}
                alt={pdfProvider.name}
                className="w-8 h-8 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Box className="h-8 w-8 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold">{pdfProvider.name}</h2>
          </>
        );
      }
      case 'web-search': {
        const wsProvider = WEB_SEARCH_PROVIDERS[selectedWebSearchProviderId];
        if (!wsProvider) return null;
        return (
          <>
            {wsProvider.icon ? (
              <img
                src={wsProvider.icon}
                alt={wsProvider.name}
                className="w-8 h-8 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Box className="h-8 w-8 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold">{wsProvider.name}</h2>
          </>
        );
      }
      case 'image': {
        const imgProvider = IMAGE_PROVIDERS[selectedImageProviderId];
        const imgIcon = IMAGE_PROVIDER_ICONS[selectedImageProviderId];
        return (
          <>
            {imgIcon ? (
              <img
                src={imgIcon}
                alt={imgProvider?.name}
                className="w-8 h-8 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Box className="h-8 w-8 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold">
              {t(`settings.${IMAGE_PROVIDER_NAMES[selectedImageProviderId]}`) || imgProvider?.name}
            </h2>
          </>
        );
      }
      case 'video': {
        const vidProvider = VIDEO_PROVIDERS[selectedVideoProviderId];
        const vidIcon = VIDEO_PROVIDER_ICONS[selectedVideoProviderId];
        return (
          <>
            {vidIcon ? (
              <img
                src={vidIcon}
                alt={vidProvider?.name}
                className="w-8 h-8 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Box className="h-8 w-8 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold">
              {t(`settings.${VIDEO_PROVIDER_NAMES[selectedVideoProviderId]}`) || vidProvider?.name}
            </h2>
          </>
        );
      }
      case 'tts': {
        const ttsIcon = TTS_PROVIDERS[ttsProviderId]?.icon;
        return (
          <>
            {ttsIcon ? (
              <img
                src={ttsIcon}
                alt=""
                className="w-8 h-8 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Volume2 className="h-6 w-6 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold">{getTTSProviderName(ttsProviderId, t)}</h2>
          </>
        );
      }
      case 'asr': {
        const asrIcon = ASR_PROVIDERS[asrProviderId]?.icon;
        return (
          <>
            {asrIcon ? (
              <img
                src={asrIcon}
                alt=""
                className="w-8 h-8 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Mic className="h-6 w-6 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold">{getASRProviderName(asrProviderId, t)}</h2>
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="block h-[88vh] w-[94vw] max-w-[1240px] overflow-hidden rounded-[32px] border border-[rgba(133,88,34,0.14)] bg-[linear-gradient(180deg,rgba(252,249,243,0.98)_0%,rgba(247,241,231,0.96)_100%)] p-0 shadow-[0_40px_120px_rgba(61,43,16,0.16)]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t('settings.title')}</DialogTitle>
        <DialogDescription className="sr-only">{t('settings.description')}</DialogDescription>
        <div className="flex h-full overflow-hidden bg-transparent">
          {/* Left Sidebar - Navigation */}
          <div
            className="flex-shrink-0 border-r border-[rgba(133,88,34,0.12)] bg-[rgba(244,237,225,0.78)] p-4"
            style={{ width: sidebarWidth }}
          >
            <div className="mb-4 rounded-[28px] border border-[rgba(133,88,34,0.12)] bg-[rgba(255,252,247,0.84)] px-4 py-4 shadow-[0_20px_40px_rgba(99,71,28,0.05)]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[rgba(120,90,54,0.72)]">
                平台
              </p>
              <h2 className="mt-2 font-serif text-[22px] font-semibold text-[rgba(47,37,24,0.96)]">
                设置中心
              </h2>
              <p className="mt-2 text-sm leading-6 text-[rgba(92,75,52,0.78)]">
                用统一的中文界面管理模型、媒体能力与系统策略。
              </p>
            </div>

            <div className="space-y-2">
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'w-full rounded-2xl border px-3 py-3 text-left transition-all duration-200',
                      isActive
                        ? 'border-[rgba(151,118,75,0.28)] bg-white/92 shadow-[0_14px_36px_rgba(101,72,30,0.07)]'
                        : 'border-transparent bg-transparent hover:border-[rgba(151,118,75,0.12)] hover:bg-white/62',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-colors',
                          isActive
                            ? 'border-[rgba(151,118,75,0.22)] bg-[rgba(246,239,228,0.95)] text-[rgba(97,69,34,0.96)]'
                            : 'border-[rgba(151,118,75,0.12)] bg-white/72 text-[rgba(123,94,58,0.82)]',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-[rgba(47,37,24,0.96)]">
                          {item.label}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[rgba(103,83,57,0.72)]">
                          {item.description}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar resize handle */}
          <div
            onMouseDown={(e) => handleResizeStart(e, 'sidebar')}
            className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
          >
            <div className="h-full w-px bg-[rgba(133,88,34,0.12)] transition-colors group-hover:bg-[rgba(151,118,75,0.38)]" />
          </div>

          {/* Middle - Provider List (only shown for provider-based sections) */}
          {activeSection === 'providers' && (
            <>
              <ProviderList
                providers={allProviders}
                selectedProviderId={selectedProviderId}
                onSelect={handleProviderSelect}
                onAddProvider={() => setShowAddProviderDialog(true)}
                width={providerListWidth}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="h-full w-px bg-[rgba(133,88,34,0.12)] transition-colors group-hover:bg-[rgba(151,118,75,0.38)]" />
              </div>
            </>
          )}

          {activeSection === 'pdf' && (
            <>
              <ProviderListColumn
                providers={Object.values(PDF_PROVIDERS)}
                configs={pdfProvidersConfig}
                selectedId={selectedPdfProviderId}
                onSelect={setSelectedPdfProviderId}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="h-full w-px bg-[rgba(133,88,34,0.12)] transition-colors group-hover:bg-[rgba(151,118,75,0.38)]" />
              </div>
            </>
          )}

          {activeSection === 'web-search' && (
            <>
              <ProviderListColumn
                providers={Object.values(WEB_SEARCH_PROVIDERS)}
                configs={webSearchProvidersConfig}
                selectedId={selectedWebSearchProviderId}
                onSelect={setSelectedWebSearchProviderId}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="h-full w-px bg-[rgba(133,88,34,0.12)] transition-colors group-hover:bg-[rgba(151,118,75,0.38)]" />
              </div>
            </>
          )}

          {activeSection === 'image' && (
            <>
              <ProviderListColumn
                providers={Object.values(IMAGE_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: t(`settings.${IMAGE_PROVIDER_NAMES[p.id]}`) || p.name,
                  icon: IMAGE_PROVIDER_ICONS[p.id],
                }))}
                configs={imageProvidersConfig}
                selectedId={selectedImageProviderId}
                onSelect={setSelectedImageProviderId}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="h-full w-px bg-[rgba(133,88,34,0.12)] transition-colors group-hover:bg-[rgba(151,118,75,0.38)]" />
              </div>
            </>
          )}

          {activeSection === 'video' && (
            <>
              <ProviderListColumn
                providers={Object.values(VIDEO_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: t(`settings.${VIDEO_PROVIDER_NAMES[p.id]}`) || p.name,
                  icon: VIDEO_PROVIDER_ICONS[p.id],
                }))}
                configs={videoProvidersConfig}
                selectedId={selectedVideoProviderId}
                onSelect={setSelectedVideoProviderId}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="h-full w-px bg-[rgba(133,88,34,0.12)] transition-colors group-hover:bg-[rgba(151,118,75,0.38)]" />
              </div>
            </>
          )}

          {activeSection === 'tts' && (
            <>
              <ProviderListColumn
                providers={Object.values(TTS_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: getTTSProviderName(p.id, t),
                  icon: p.icon,
                }))}
                configs={ttsProvidersConfig}
                selectedId={ttsProviderId}
                onSelect={setTTSProvider}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="h-full w-px bg-[rgba(133,88,34,0.12)] transition-colors group-hover:bg-[rgba(151,118,75,0.38)]" />
              </div>
            </>
          )}

          {activeSection === 'asr' && (
            <>
              <ProviderListColumn
                providers={Object.values(ASR_PROVIDERS).map((p) => ({
                  id: p.id,
                  name: getASRProviderName(p.id, t),
                  icon: p.icon,
                }))}
                configs={asrProvidersConfig}
                selectedId={asrProviderId}
                onSelect={setASRProvider}
                width={providerListWidth}
                t={t}
              />
              <div
                onMouseDown={(e) => handleResizeStart(e, 'providerList')}
                className="flex-shrink-0 w-[5px] cursor-col-resize group flex justify-center"
              >
                <div className="h-full w-px bg-[rgba(133,88,34,0.12)] transition-colors group-hover:bg-[rgba(151,118,75,0.38)]" />
              </div>
            </>
          )}

          {/* Right - Configuration Panel */}
          <div className="flex-1 min-w-0 overflow-hidden bg-[rgba(255,252,247,0.62)]">
            <div className="flex h-full flex-col overflow-hidden rounded-l-[28px] bg-[rgba(255,252,247,0.52)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[rgba(133,88,34,0.12)] px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">{getHeaderContent()}</div>
                {activeSectionMeta && (
                  <p className="mt-2 text-sm text-[rgba(103,83,57,0.76)]">
                    {activeSectionMeta.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeSection === 'providers' &&
                  !providersConfig[selectedProviderId]?.isBuiltIn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-2xl px-3 text-[rgba(140,58,45,0.9)] hover:bg-[rgba(179,88,74,0.08)] hover:text-[rgba(140,58,45,0.96)]"
                      onClick={() => handleDeleteProvider(selectedProviderId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-2xl text-[rgba(96,71,39,0.78)] hover:bg-[rgba(151,118,75,0.08)] hover:text-[rgba(56,42,23,0.96)]"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {activeSection === 'general' && <GeneralSettings />}

              {activeSection === 'providers' && selectedProvider && (
                <ProviderConfigPanel
                  provider={selectedProvider}
                  initialApiKey={providersConfig[selectedProviderId]?.apiKey || ''}
                  initialBaseUrl={providersConfig[selectedProviderId]?.baseUrl || ''}
                  initialRequiresApiKey={
                    providersConfig[selectedProviderId]?.requiresApiKey ?? true
                  }
                  providersConfig={providersConfig}
                  onConfigChange={(apiKey, baseUrl, requiresApiKey) =>
                    handleProviderConfigChange(selectedProviderId, apiKey, baseUrl, requiresApiKey)
                  }
                  onSave={handleProviderConfigSave}
                  onEditModel={(index) => handleEditModel(selectedProviderId, index)}
                  onDeleteModel={(index) => handleDeleteModel(selectedProviderId, index)}
                  onAddModel={handleAddModel}
                  onResetToDefault={() => handleResetProvider(selectedProviderId)}
                  isBuiltIn={providersConfig[selectedProviderId]?.isBuiltIn ?? true}
                />
              )}

              {activeSection === 'pdf' && (
                <PDFSettings selectedProviderId={selectedPdfProviderId} />
              )}
              {activeSection === 'web-search' && (
                <WebSearchSettings selectedProviderId={selectedWebSearchProviderId} />
              )}
              {activeSection === 'image' && (
                <ImageSettings selectedProviderId={selectedImageProviderId} />
              )}
              {activeSection === 'video' && (
                <VideoSettings selectedProviderId={selectedVideoProviderId} />
              )}
              {activeSection === 'tts' && <TTSSettings selectedProviderId={ttsProviderId} />}
              {activeSection === 'asr' && <ASRSettings selectedProviderId={asrProviderId} />}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[rgba(133,88,34,0.12)] bg-[rgba(246,240,230,0.78)] px-6 py-4">
              {saveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-sm text-[rgba(103,83,57,0.82)]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t('settings.saveSuccess')}</span>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-sm text-[rgba(140,58,45,0.86)]">
                  <XCircle className="h-4 w-4" />
                  <span>{t('settings.saveFailed')}</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-2xl border-[rgba(151,118,75,0.18)] bg-white/86 px-4 text-[rgba(88,66,37,0.9)] hover:bg-white"
                onClick={() => onOpenChange(false)}
              >
                {t('settings.close')}
              </Button>
              <Button
                size="sm"
                className="h-10 rounded-2xl bg-[rgba(71,54,31,0.96)] px-5 text-white hover:bg-[rgba(55,41,24,0.96)]"
                onClick={handleSave}
              >
                {t('settings.save')}
              </Button>
            </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Edit Model Dialog */}
      <ModelEditDialog
        open={showModelDialog}
        onOpenChange={setShowModelDialog}
        editingModel={editingModel}
        setEditingModel={setEditingModel}
        onSave={handleSaveModel}
        onAutoSave={handleAutoSaveModel}
        providerId={selectedProviderId}
        apiKey={providersConfig[selectedProviderId]?.apiKey || ''}
        baseUrl={providersConfig[selectedProviderId]?.baseUrl}
        providerType={providersConfig[selectedProviderId]?.type}
        requiresApiKey={providersConfig[selectedProviderId]?.requiresApiKey}
        isServerConfigured={providersConfig[selectedProviderId]?.isServerConfigured}
      />

      {/* Add Provider Dialog */}
      <AddProviderDialog
        open={showAddProviderDialog}
        onOpenChange={setShowAddProviderDialog}
        onAdd={handleAddProvider}
      />

      {/* Delete Provider Confirmation */}
      <AlertDialog
        open={providerToDelete !== null}
        onOpenChange={(open) => !open && setProviderToDelete(null)}
      >
        <AlertDialogContent className="rounded-[28px] border-[rgba(133,88,34,0.14)] bg-[rgba(255,251,245,0.98)] shadow-[0_28px_80px_rgba(61,43,16,0.18)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.deleteProvider')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.deleteProviderConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.cancelEdit')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProvider}>
              {t('settings.deleteProvider')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
