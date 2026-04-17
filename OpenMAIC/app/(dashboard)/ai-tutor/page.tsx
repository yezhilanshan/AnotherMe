'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Copy,
  History,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import { UNIFIED_MENTOR_PRESET } from '@/lib/orchestration/registry/classroom-presets';

type TutorMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: 'up' | 'down' | null;
};

type TutorSession = {
  id: string;
  title: string;
  autoTitle: boolean;
  createdAt: string;
  updatedAt: string;
  messages: TutorMessage[];
};

type ChatApiEvent = {
  type: string;
  data?: Record<string, unknown>;
};

type ChatRequestMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
};

const STORAGE_KEY = 'openmaic:ai-tutor:sessions:v1';
const MAX_SESSIONS = 40;

const QUICK_ACTIONS = [
  '解释更详细一点',
  '换一种解法',
  '出几道同类题',
  '总结本题关键公式',
];

const AI_TUTOR_DETAILED_SYSTEM_PROMPT = `You are a detailed AI tutor. Use "in-depth explanation mode" by default:
- Start with the conclusion, then explain the principle, give examples, show common mistakes, and provide practice problems
- Answer in detail unless I explicitly say "brief"
- For key concepts, explain the definition, purpose, boundary conditions, and comparisons
- For step-by-step problems, show all steps without skipping
- End your response with: "You can ask me 3 more questions"
- Always respond in Chinese (Simplified) regardless of the language used in these instructions`;

function parseSSEChunk(buffer: string) {
  const events: string[] = [];
  let rest = buffer;

  while (true) {
    const separatorIndex = rest.indexOf('\n\n');
    if (separatorIndex < 0) break;
    const one = rest.slice(0, separatorIndex);
    rest = rest.slice(separatorIndex + 2);
    events.push(one);
  }

  return { events, rest };
}

async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string; details?: string };
    return payload.error || payload.details || '';
  } catch {
    return await response.text();
  }
}

function sessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSession(): TutorSession {
  const now = new Date().toISOString();
  return {
    id: sessionId(),
    title: '新会话',
    autoTitle: true,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function deriveSessionTitle(messages: TutorMessage[]): string {
  const firstUser = messages.find((item) => item.role === 'user' && item.content.trim());
  if (!firstUser) return '新会话';
  const normalized = firstUser.content.replace(/\s+/g, ' ').trim();
  return normalized.length > 20 ? `${normalized.slice(0, 20)}...` : normalized;
}

function safeParseSessions(raw: string | null): TutorSession[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TutorSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && Array.isArray(item.messages))
      .map((item) => ({
        id: item.id,
        title: typeof item.title === 'string' && item.title.trim() ? item.title : '新会话',
        autoTitle: Boolean(item.autoTitle),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        messages: item.messages
          .filter((msg) => msg && typeof msg.id === 'string')
          .map((msg) => ({
            id: msg.id,
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: typeof msg.content === 'string' ? msg.content : '',
          })),
      }));
  } catch {
    return [];
  }
}

function formatSessionTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AITutorPage() {
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const orderedSessions = useMemo(
    () => [...sessions].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [sessions],
  );

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  const messages = useMemo(() => activeSession?.messages || [], [activeSession]);

  useEffect(() => {
    const savedSessions = safeParseSessions(localStorage.getItem(STORAGE_KEY));
    if (savedSessions.length > 0) {
      const sorted = [...savedSessions].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
      setSessions(sorted.slice(0, MAX_SESSIONS));
      setActiveSessionId(sorted[0].id);
      setHydrated(true);
      return;
    }

    const initial = createSession();
    setSessions([initial]);
    setActiveSessionId(initial.id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [hydrated, sessions]);

  useEffect(() => {
    if (!activeSessionId && orderedSessions[0]?.id) {
      setActiveSessionId(orderedSessions[0].id);
      return;
    }

    if (activeSessionId && !sessions.some((item) => item.id === activeSessionId)) {
      setActiveSessionId(orderedSessions[0]?.id || '');
    }
  }, [activeSessionId, orderedSessions, sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const updateSessionMessages = useCallback(
    (targetSessionId: string, updater: (prev: TutorMessage[]) => TutorMessage[]) => {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.id !== targetSessionId) return session;
          const nextMessages = updater(session.messages);
          const nextTitle = session.autoTitle ? deriveSessionTitle(nextMessages) : session.title;
          return {
            ...session,
            messages: nextMessages,
            title: nextTitle || '新会话',
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [],
  );

  const toRequestMessages = (list: TutorMessage[]): ChatRequestMessage[] => {
    return list.map((item) => ({
      id: item.id,
      role: item.role,
      parts: [{ type: 'text', text: item.content }],
    }));
  };

  const handleNewSession = () => {
    if (isTyping) return;
    abortControllerRef.current?.abort();
    const next = createSession();
    setSessions((prev) => [next, ...prev].slice(0, MAX_SESSIONS));
    setActiveSessionId(next.id);
    setErrorText('');
    setInput('');
  };

  const handleRenameSession = () => {
    if (!activeSession || isTyping) return;
    const nextTitle = window.prompt('请输入新标题', activeSession.title)?.trim();
    if (!nextTitle) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              title: nextTitle,
              autoTitle: false,
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
  };

  const handleClearCurrent = () => {
    if (!activeSession || isTyping) return;
    if (!window.confirm('确定清空当前会话记录吗？')) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              messages: [],
              autoTitle: true,
              title: '新会话',
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
    setErrorText('');
  };

  const handleClearAll = () => {
    if (isTyping) return;
    if (!window.confirm('确定清空全部历史会话吗？')) return;
    abortControllerRef.current?.abort();

    const fresh = createSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setInput('');
    setErrorText('');
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const handleSaveEdit = () => {
    if (!editingMessageId || !activeSession) return;
    updateSessionMessages(activeSession.id, (prev) =>
      prev.map((msg) => (msg.id === editingMessageId ? { ...msg, content: editingContent } : msg)),
    );
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleRetry = async (messageId: string) => {
    if (isTyping || !activeSession) return;

    const messageIndex = activeSession.messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;

    const userMessage = activeSession.messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    // 删除这条AI回复及其之后的所有消息
    const messagesToKeep = activeSession.messages.slice(0, messageIndex);
    updateSessionMessages(activeSession.id, () => messagesToKeep);

    // 重新发送用户消息
    await handleSend(userMessage.content);
  };

  const handleFeedback = (messageId: string, feedback: 'up' | 'down' | null) => {
    if (!activeSession) return;
    updateSessionMessages(activeSession.id, (prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, feedback } : msg)),
    );
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping || !activeSession) return;

    const targetSessionId = activeSession.id;
    const userMessage: TutorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const assistantId = `assistant-${Date.now() + 1}`;
    const assistantPlaceholder: TutorMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };

    const snapshotMessages = [...activeSession.messages, userMessage, assistantPlaceholder];
    updateSessionMessages(targetSessionId, () => snapshotMessages);
    setInput('');
    setIsTyping(true);
    setErrorText('');

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let assistantContent = '';
    const deltaQueue: string[] = [];

    const renderAssistant = () => {
      updateSessionMessages(targetSessionId, (prev) =>
        prev.map((msg) => (msg.id === assistantId ? { ...msg, content: assistantContent } : msg)),
      );
    };

    const flushDelta = (budget = 2) => {
      let remaining = budget;
      let changed = false;
      while (remaining > 0 && deltaQueue.length > 0) {
        const chunk = deltaQueue[0];
        if (!chunk) {
          deltaQueue.shift();
          continue;
        }

        const take = Math.min(remaining, chunk.length);
        assistantContent += chunk.slice(0, take);
        remaining -= take;
        changed = true;

        if (take >= chunk.length) {
          deltaQueue.shift();
        } else {
          deltaQueue[0] = chunk.slice(take);
        }
      }

      if (changed) {
        renderAssistant();
      }
      return changed;
    };

    const streamTimer = window.setInterval(() => {
      flushDelta(2);
    }, 18);

    try {
      const modelConfig = getCurrentModelConfig();
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: toRequestMessages(snapshotMessages.slice(0, -1)),
          storeState: {
            stage: null,
            scenes: [],
            currentSceneId: null,
            mode: 'autonomous',
            whiteboardOpen: false,
          },
          config: {
            agentIds: [UNIFIED_MENTOR_PRESET.id],
            sessionType: 'qa',
            systemPromptAddendum: AI_TUTOR_DETAILED_SYSTEM_PROMPT,
          },
          apiKey: modelConfig.apiKey || '',
          baseUrl: modelConfig.baseUrl || undefined,
          model: modelConfig.modelString || undefined,
          providerType: modelConfig.providerType || undefined,
          requiresApiKey: modelConfig.requiresApiKey,
        }),
      });

      if (!response.ok) {
        const errText = await parseApiError(response);
        throw new Error(errText || 'AI 导师服务暂时不可用。');
      }

      if (!response.body) {
        throw new Error('AI 导师服务未返回可读取的流。');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let rawBuffer = '';

      const processEventBlocks = (blocks: string[]) => {
        for (const block of blocks) {
          const dataLines = block
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.startsWith('data:'));

          for (const line of dataLines) {
            const payloadText = line.replace(/^data:\s*/, '');
            if (!payloadText) continue;

            let event: ChatApiEvent;
            try {
              event = JSON.parse(payloadText) as ChatApiEvent;
            } catch {
              continue;
            }

            if (event.type === 'text_delta') {
              const delta = typeof event.data?.content === 'string' ? event.data.content : '';
              if (delta) {
                deltaQueue.push(delta);
              }
            }

            if (event.type === 'text_end') {
              const fullText = typeof event.data?.content === 'string' ? event.data.content : '';
              if (fullText) {
                const pendingText = `${assistantContent}${deltaQueue.join('')}`;
                if (fullText.startsWith(pendingText)) {
                  const tail = fullText.slice(pendingText.length);
                  if (tail) deltaQueue.push(tail);
                } else {
                  deltaQueue.length = 0;
                  assistantContent = fullText;
                  renderAssistant();
                }
              }
            }

            if (event.type === 'error') {
              const message =
                typeof event.data?.message === 'string' ? event.data.message : 'AI 导师返回错误。';
              throw new Error(message);
            }
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        rawBuffer += decoder.decode(value, { stream: true });
        const parsed = parseSSEChunk(rawBuffer);
        rawBuffer = parsed.rest;
        processEventBlocks(parsed.events);
      }

      rawBuffer += decoder.decode();
      const tailParsed = parseSSEChunk(rawBuffer);
      processEventBlocks(tailParsed.events);

      while (flushDelta(9999)) {
        // flush all remaining queued chars
      }

      if (!assistantContent.trim()) {
        assistantContent = '收到请求，但当前没有返回文本结果。请检查模型配置后重试。';
        renderAssistant();
      }
    } catch (error) {
      if (controller.signal.aborted) {
        // switched session or new request; ignore aborted errors
      } else {
        setErrorText(error instanceof Error ? error.message : 'AI 导师请求失败。');
        updateSessionMessages(targetSessionId, (prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: '请求失败，请检查后端模型配置是否可用。',
                }
              : msg,
          ),
        );
      }
    } finally {
      window.clearInterval(streamTimer);
      setIsTyping(false);
    }
  };

  if (!hydrated || !activeSession) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        正在初始化 AI 导师...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-[#FAFAFA]">
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`p-4 border-b border-gray-200 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
          <button
            type="button"
            disabled={isTyping}
            onClick={handleNewSession}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              sidebarCollapsed ? 'p-2' : 'w-full'
            }`}
            title={sidebarCollapsed ? '新对话' : ''}
          >
            <Plus className="h-4 w-4" />
            {!sidebarCollapsed && <span>新对话</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {orderedSessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <button
                key={session.id}
                type="button"
                disabled={isTyping}
                onClick={() => setActiveSessionId(session.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all disabled:cursor-not-allowed ${
                  active
                    ? 'bg-orange-50 text-orange-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                title={sidebarCollapsed ? session.title : ''}
              >
                {!sidebarCollapsed ? (
                  <>
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatSessionTime(session.updatedAt)}</p>
                  </>
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                    <MessageSquareText className="h-4 w-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-gray-200">
          <button
            type="button"
            disabled={isTyping}
            onClick={handleClearAll}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title={sidebarCollapsed ? '清空对话历史' : ''}
          >
            <Trash2 className="h-4 w-4" />
            {!sidebarCollapsed && <span>清空对话历史</span>}
          </button>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title={sidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {sidebarCollapsed ? (
              <Plus className="h-4 w-4 rotate-45" />
            ) : (
              <>
                <Plus className="h-4 w-4 rotate-45" />
                <span>折叠</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="h-14 border-b border-gray-200 flex items-center px-6 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800">AI 导师</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto px-6">
              <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg">
                <Bot className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-3">今天想学习什么数学知识？</h1>
              <p className="text-sm text-gray-500 mb-10 text-center">
                支持 Markdown 与 LaTeX 数学公式，回复会以流式逐字呈现
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                {[
                  '帮我复习二次函数',
                  '解释一下勾股定理并给出公式推导',
                  '出一道相似三角形练习题并附答案',
                  '如何提高解题速度',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      void handleSend(suggestion);
                    }}
                    disabled={isTyping}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 text-left disabled:opacity-60 transition-colors border border-gray-200"
                  >
                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-orange-500 shrink-0 shadow-sm">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {messages.map((msg, index) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className="shrink-0">
                    {msg.role === 'user' ? (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                        你
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div
                    className={`flex-1 max-w-[90%] ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-200'
                      }`}
                    >
                      {editingMessageId === msg.id && msg.role === 'user' ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full min-h-[80px] bg-white/20 text-white rounded-lg px-3 py-2 text-sm outline-none resize-y placeholder:text-white/70"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 text-xs rounded-md bg-white/20 text-white hover:bg-white/30"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="px-3 py-1.5 text-xs rounded-md bg-white text-blue-600 hover:bg-gray-100"
                            >
                              保存
                            </button>
                          </div>
                        </div>
                      ) : msg.role === 'assistant' ? (
                        <div className="ai-tutor-markdown text-gray-800">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              code: ({ children, className, ...props }) => {
                                if (!className) {
                                  return (
                                    <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-sm" {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                                return (
                                  <pre className="overflow-x-auto bg-gray-900 text-gray-100 rounded-lg p-3 my-2 text-sm">
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                );
                              },
                            }}
                          >
                            {msg.content || (isTyping && index === messages.length - 1 ? '思考中...' : '')}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                    <div className={`flex gap-1.5 mt-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'user' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditMessage(msg.id, msg.content)}
                            disabled={isTyping}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50 flex items-center gap-1 text-xs transition-colors"
                            title="编辑"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs transition-colors"
                            title="复制"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.content)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs transition-colors"
                            title="复制"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRetry(msg.id)}
                            disabled={isTyping}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50 flex items-center gap-1 text-xs transition-colors"
                            title="重试"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, msg.feedback === 'up' ? null : 'up')}
                            disabled={isTyping}
                            className={`p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1 text-xs transition-colors ${
                              msg.feedback === 'up' ? 'text-orange-600' : 'text-gray-400 hover:text-orange-600'
                            }`}
                            title="点赞"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, msg.feedback === 'down' ? null : 'down')}
                            disabled={isTyping}
                            className={`p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1 text-xs transition-colors ${
                              msg.feedback === 'down' ? 'text-orange-600' : 'text-gray-400 hover:text-orange-600'
                            }`}
                            title="点踩"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping ? (
                <div className="flex gap-3 items-center text-gray-400 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>思考中...</span>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          {errorText ? <p className="text-xs text-red-600 mb-2">{errorText}</p> : null}

          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_ACTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={isTyping}
                  onClick={() => {
                    void handleSend(item);
                  }}
                  className="px-3 py-1.5 text-xs rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-50 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend(input);
                  }
                }}
                placeholder="输入你的数学问题（按 Enter 发送，Shift + Enter 换行）..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-14 text-sm outline-none resize-none placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <div className="absolute right-2 bottom-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleSend(input);
                  }}
                  disabled={!input.trim() || isTyping}
                  className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm"
                  title="发送"
                  aria-label="发送"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
