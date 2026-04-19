'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Edit, Send, Loader2, MessageSquare, Users, UserPlus, X } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings';
import { useAuth } from '@/components/auth/auth-provider';

type ConversationSummary = {
  conversation_id: string;
  type: string;
  name: string;
  creator_id: string;
  last_message_id?: string | null;
  last_message_time?: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
};

type ConversationMessage = {
  message_id: string;
  conversation_id: string;
  seq: number;
  sender_id: string;
  message_type: string;
  content: string;
  source_type: string;
  source_ref_id?: string | null;
  created_at: string;
};

type ConversationMember = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  mute_flag: boolean;
  unread_count: number;
  last_read_message_id?: string | null;
  last_read_seq: number;
};

type AIChatSession = {
  session_id: string;
  user_id: string;
  title: string;
};

type AIChatMessage = {
  message_id: string;
};

type ChatMessage = {
  id: string;
  sender: string;
  role: 'assistant' | 'student' | 'peer';
  text: string;
  time: string;
};

type ConversationsResponse = {
  success: boolean;
  conversations?: ConversationSummary[];
  error?: string;
};

type ConversationResponse = {
  success: boolean;
  conversation?: ConversationSummary;
  error?: string;
};

type MessagesResponse = {
  success: boolean;
  messages?: ConversationMessage[];
  error?: string;
};

type MessageResponse = {
  success: boolean;
  message?: ConversationMessage;
  error?: string;
};

type MembersResponse = {
  success: boolean;
  members?: ConversationMember[];
  error?: string;
};

type RemoveMemberResponse = {
  success: boolean;
  result?: {
    conversation_id: string;
    member_user_id: string;
    removed: boolean;
  };
  error?: string;
};

type AISessionsResponse = {
  success: boolean;
  sessions?: AIChatSession[];
  error?: string;
};

type AISessionResponse = {
  success: boolean;
  session?: AIChatSession;
  error?: string;
};

type AIMessageResponse = {
  success: boolean;
  message?: AIChatMessage;
  error?: string;
};

type SearchResponse = {
  success: boolean;
  answer?: string;
  sources?: Array<{ title: string; url: string }>;
  error?: string;
};

type WSConfigResponse = {
  success: boolean;
  wsBaseUrl?: string;
  error?: string;
};

const ASSISTANT_ID = 'system-assistant';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function mapBackendMessage(message: ConversationMessage, currentUserId: string): ChatMessage {
  const isUser = message.sender_id === currentUserId;
  const isAssistant = message.sender_id === ASSISTANT_ID;
  return {
    id: message.message_id,
    sender: isUser ? '你' : isAssistant ? '系统助手' : message.sender_id,
    role: isUser ? 'student' : isAssistant ? 'assistant' : 'peer',
    text: message.content,
    time: formatTime(message.created_at),
  };
}

function parseMemberIds(value: string): string[] {
  return value
    .split(/[，,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id || '';
  const userReady = Boolean(user && !authLoading);
  const [contacts, setContacts] = useState<ConversationSummary[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [memberMap, setMemberMap] = useState<Record<string, ConversationMember[]>>({});
  const [membersApiEnabled, setMembersApiEnabled] = useState(true);
  const [aiSessionByConversation, setAiSessionByConversation] = useState<Record<string, string>>({});
  const [wsBaseUrl, setWsBaseUrl] = useState('');
  const [wsConnected, setWsConnected] = useState(false);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [memberUpdating, setMemberUpdating] = useState(false);
  const [errorText, setErrorText] = useState('');

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');
  const [addMembersInput, setAddMembersInput] = useState('');
  const webSearchProviderId = useSettingsStore((s) => s.webSearchProviderId);
  const webSearchProvidersConfig = useSettingsStore((s) => s.webSearchProvidersConfig);

  const selectedContact = useMemo(() => {
    return contacts.find((contact) => contact.conversation_id === selectedContactId);
  }, [contacts, selectedContactId]);

  const activeMessages = useMemo(() => {
    if (!selectedContactId) return [];
    return threads[selectedContactId] || [];
  }, [threads, selectedContactId]);

  const activeMembers = useMemo(() => {
    if (!selectedContactId) return [];
    return memberMap[selectedContactId] || [];
  }, [memberMap, selectedContactId]);

  const fetchConversations = useCallback(
    async (preferredId?: string) => {
      const response = await fetch(
        `/api/messages/conversations?userId=${encodeURIComponent(currentUserId)}&limit=30`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );
      const payload = (await response.json()) as ConversationsResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || '加载会话失败。');
      }

      let list = payload.conversations || [];
      if (list.length === 0) {
        const created = await fetch('/api/messages/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            type: 'single',
            name: '系统助手',
            creatorId: currentUserId,
            memberIds: [ASSISTANT_ID],
          }),
        });

        const createdPayload = (await created.json()) as ConversationResponse;
        if (!created.ok || !createdPayload.success || !createdPayload.conversation) {
          throw new Error(createdPayload.error || '创建默认会话失败。');
        }
        list = [createdPayload.conversation];
      }

      setContacts(list);
      const hasConversation = (id: string) => list.some((item) => item.conversation_id === id);
      const nextSelected =
        (preferredId && hasConversation(preferredId) ? preferredId : '') ||
        (selectedContactId && hasConversation(selectedContactId) ? selectedContactId : '') ||
        list[0]?.conversation_id ||
        '';
      if (nextSelected) {
        setSelectedContactId(nextSelected);
      }
    },
    [currentUserId, selectedContactId],
  );

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      const response = await fetch(
        `/api/messages/${conversationId}/messages?userId=${encodeURIComponent(currentUserId)}&limit=200`,
        {
        method: 'GET',
        cache: 'no-store',
        },
      );
      const payload = (await response.json()) as MessagesResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || '加载消息失败。');
      }

      const mapped = (payload.messages || []).map((item) => mapBackendMessage(item, currentUserId));
      setThreads((prev) => ({
        ...prev,
        [conversationId]: mapped,
      }));

      await fetch(`/api/messages/${conversationId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
    },
    [currentUserId],
  );

  const loadConversationMembers = useCallback(
    async (conversationId: string) => {
      const response = await fetch(
        `/api/messages/${conversationId}/members?userId=${encodeURIComponent(currentUserId)}`,
        {
          method: 'GET',
          cache: 'no-store',
        },
      );
      if (response.status === 404) {
        setMembersApiEnabled(false);
        setMemberMap((prev) => ({
          ...prev,
          [conversationId]: [],
        }));
        return;
      }
      const payload = (await response.json()) as MembersResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || '加载成员失败。');
      }

      setMemberMap((prev) => ({
        ...prev,
        [conversationId]: payload.members || [],
      }));
    },
    [currentUserId],
  );

  const ensureAiSession = async (conversationId: string, conversationName?: string) => {
    const cached = aiSessionByConversation[conversationId];
    if (cached) return cached;

    const listResponse = await fetch(
      `/api/ai/sessions?userId=${encodeURIComponent(currentUserId)}&conversationId=${encodeURIComponent(conversationId)}&limit=1`,
      {
        method: 'GET',
        cache: 'no-store',
      },
    );
    const listPayload = (await listResponse.json()) as AISessionsResponse;
    if (!listResponse.ok || !listPayload.success) {
      throw new Error(listPayload.error || '查询 AI 会话失败。');
    }

    const existing = listPayload.sessions?.[0];
    if (existing) {
      setAiSessionByConversation((prev) => ({ ...prev, [conversationId]: existing.session_id }));
      return existing.session_id;
    }

    const created = await fetch('/api/ai/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        title: `${conversationName || '系统助手'}会话`,
        source: '课后答疑',
        linkedConversationId: conversationId,
      }),
    });
    const createdPayload = (await created.json()) as AISessionResponse;
    if (!created.ok || !createdPayload.success || !createdPayload.session) {
      throw new Error(createdPayload.error || '创建 AI 会话失败。');
    }

    setAiSessionByConversation((prev) => ({ ...prev, [conversationId]: createdPayload.session!.session_id }));
    return createdPayload.session.session_id;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/messages/ws-config', { method: 'GET', cache: 'no-store' });
        const payload = (await response.json()) as WSConfigResponse;
        if (!response.ok || !payload.success || !payload.wsBaseUrl) {
          throw new Error(payload.error || '获取 WebSocket 地址失败');
        }
        if (!cancelled) {
          setWsBaseUrl(payload.wsBaseUrl);
        }
      } catch {
        if (!cancelled) {
          setWsBaseUrl('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userReady) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        await fetchConversations();
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : '加载消息页面失败。');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchConversations, userReady]);

  useEffect(() => {
    if (!selectedContactId) return;

    let cancelled = false;
    (async () => {
      try {
        const tasks: Array<Promise<void>> = [loadConversationMessages(selectedContactId)];
        if (membersApiEnabled) {
          tasks.push(loadConversationMembers(selectedContactId));
        }
        await Promise.all(tasks);
      } catch (error) {
        if (!cancelled) {
          setErrorText(error instanceof Error ? error.message : '加载会话数据失败。');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadConversationMembers, loadConversationMessages, membersApiEnabled, selectedContactId]);

  useEffect(() => {
    if (!selectedContactId || !currentUserId || !wsBaseUrl || !userReady) {
      setWsConnected(false);
      return;
    }

    let closedManually = false;
    const wsQuery = new URLSearchParams({ user_id: currentUserId });

    const ws = new WebSocket(`${wsBaseUrl}/ws/messages/${selectedContactId}?${wsQuery.toString()}`);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onclose = () => {
      setWsConnected(false);
      if (!closedManually) {
        // Auto reconnect is handled by effect dependency changes or refresh.
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          message?: ConversationMessage;
          members?: ConversationMember[];
        };

        if (payload.type === 'message_created' && payload.message) {
          const mapped = mapBackendMessage(payload.message, currentUserId);
          setThreads((prev) => {
            const existing = prev[selectedContactId] || [];
            if (existing.some((item) => item.id === mapped.id)) {
              return prev;
            }
            return {
              ...prev,
              [selectedContactId]: [...existing, mapped],
            };
          });
          void fetchConversations(selectedContactId);
          return;
        }

        if (payload.type === 'members_updated' && Array.isArray(payload.members)) {
          setMemberMap((prev) => ({
            ...prev,
            [selectedContactId]: payload.members || [],
          }));
        }
      } catch {
        // Ignore malformed events.
      }
    };

    return () => {
      closedManually = true;
      ws.close();
    };
  }, [currentUserId, fetchConversations, selectedContactId, userReady, wsBaseUrl]);

  const handleCreateGroupConversation = async () => {
    const name = newGroupName.trim();
    if (!name) {
      setErrorText('请先输入群聊名称。');
      return;
    }

    const memberIds = parseMemberIds(newGroupMembers).filter((id) => id !== currentUserId);

    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          type: 'group',
          name,
          creatorId: currentUserId,
          memberIds,
        }),
      });

      const payload = (await response.json()) as ConversationResponse;
      if (!response.ok || !payload.success || !payload.conversation) {
        throw new Error(payload.error || '创建群聊失败。');
      }

      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupMembers('');
      await fetchConversations(payload.conversation.conversation_id);
      await loadConversationMembers(payload.conversation.conversation_id);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '创建群聊失败。');
    }
  };

  const handleAddMembers = async () => {
    if (!membersApiEnabled) {
      setErrorText('当前环境未启用成员管理接口。');
      return;
    }
    if (!selectedContactId) return;

    const memberIds = parseMemberIds(addMembersInput).filter((id) => id !== currentUserId);
    if (memberIds.length === 0) {
      setErrorText('请输入要添加的成员 userId。');
      return;
    }

    setMemberUpdating(true);
    try {
      const response = await fetch(`/api/messages/${selectedContactId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorUserId: currentUserId,
          memberIds,
        }),
      });

      const payload = (await response.json()) as MembersResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || '添加成员失败。');
      }

      setMemberMap((prev) => ({
        ...prev,
        [selectedContactId]: payload.members || [],
      }));
      setAddMembersInput('');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '添加成员失败。');
    } finally {
      setMemberUpdating(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!membersApiEnabled) {
      setErrorText('当前环境未启用成员管理接口。');
      return;
    }
    if (!selectedContactId || !memberUserId || memberUserId === currentUserId) return;

    setMemberUpdating(true);
    try {
      const response = await fetch(
        `/api/messages/${selectedContactId}/members/${encodeURIComponent(memberUserId)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operatorUserId: currentUserId }),
        },
      );

      const payload = (await response.json()) as RemoveMemberResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || '移除成员失败。');
      }

      await loadConversationMembers(selectedContactId);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '移除成员失败。');
    } finally {
      setMemberUpdating(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !selectedContactId) return;

    const conversationId = selectedContactId;
    const conversationName = selectedContact?.name || '系统助手';

    setInput('');
    setSending(true);
    setErrorText('');

    try {
      const userMessageResponse = await fetch(`/api/messages/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          content: text,
          messageType: 'text',
          sourceType: 'manual',
        }),
      });
      const userMessagePayload = (await userMessageResponse.json()) as MessageResponse;
      if (!userMessageResponse.ok || !userMessagePayload.success) {
        throw new Error(userMessagePayload.error || '发送用户消息失败。');
      }

      if (selectedContact?.type === 'single') {
        const aiSessionId = await ensureAiSession(conversationId, conversationName);

        const aiUserResponse = await fetch(`/api/ai/sessions/${aiSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'user',
            content: text,
            userId: currentUserId,
            contentType: 'text',
            requestId: `msg-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          }),
        });
        const aiUserPayload = (await aiUserResponse.json()) as AIMessageResponse;
        if (!aiUserResponse.ok || !aiUserPayload.success) {
          throw new Error(aiUserPayload.error || '写入 AI 用户消息失败。');
        }

        const searchResponse = await fetch('/api/web-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: text,
            apiKey: webSearchProvidersConfig?.[webSearchProviderId]?.apiKey || undefined,
            baseUrl: webSearchProvidersConfig?.[webSearchProviderId]?.baseUrl || undefined,
          }),
        });

        const searchPayload = (await searchResponse.json()) as SearchResponse;
        if (!searchResponse.ok || !searchPayload.success) {
          throw new Error(searchPayload.error || '后端检索失败。');
        }

        const sourceHint = searchPayload.sources?.[0]?.title
          ? `\n\n参考来源：${searchPayload.sources[0].title}`
          : '';
        const assistantText = `${searchPayload.answer || '已完成查询，但未返回答案。'}${sourceHint}`;

        const aiAssistantResponse = await fetch(`/api/ai/sessions/${aiSessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'assistant',
            content: assistantText,
            userId: currentUserId,
            contentType: 'text',
            modelName: 'web-search-proxy',
            requestId: `msg-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          }),
        });
        const aiAssistantPayload = (await aiAssistantResponse.json()) as AIMessageResponse;
        if (!aiAssistantResponse.ok || !aiAssistantPayload.success || !aiAssistantPayload.message) {
          throw new Error(aiAssistantPayload.error || '写入 AI 助手消息失败。');
        }

        const assistantMessageResponse = await fetch(`/api/messages/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: ASSISTANT_ID,
            content: assistantText,
            messageType: 'text',
            sourceType: 'ai',
            sourceRefId: aiAssistantPayload.message.message_id,
          }),
        });
        const assistantMessagePayload = (await assistantMessageResponse.json()) as MessageResponse;
        if (!assistantMessageResponse.ok || !assistantMessagePayload.success) {
          throw new Error(assistantMessagePayload.error || '写入会话助手消息失败。');
        }

        void fetch(`/api/ai/sessions/${aiSessionId}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        });
      }

      await Promise.all([loadConversationMessages(conversationId), fetchConversations(conversationId)]);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '消息发送失败。');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        正在加载消息...
      </div>
    );
  }

  if (errorText && activeMessages.length === 0) {
    return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3">{errorText}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
      <div className="bg-white shadow-sm h-full flex overflow-hidden">
        <div className="w-84 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">消息中心</h2>
              <button
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                type="button"
                aria-label="新建群聊"
                title="新建群聊"
                onClick={() => setShowCreateGroup((prev) => !prev)}
              >
                <Edit className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索会话..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#F4F3F0] border-none text-sm outline-none"
              />
            </div>

            <p className="text-[11px] text-gray-500">当前用户：{currentUserId}</p>

            {showCreateGroup ? (
              <div className="mt-3 p-3 bg-[#F4F3F0] space-y-2">
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="群聊名称（如：高一一班数学群）"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 outline-none"
                />
                <input
                  value={newGroupMembers}
                  onChange={(e) => setNewGroupMembers(e.target.value)}
                  placeholder="成员 userId，逗号分隔"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleCreateGroupConversation();
                  }}
                  className="w-full py-2 text-sm bg-black text-white"
                >
                  创建群聊
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">暂无会话。</div>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.conversation_id}
                  type="button"
                  onClick={() => setSelectedContactId(contact.conversation_id)}
                  className={`w-full text-left p-4 flex items-center gap-3 transition-colors border-b border-gray-50 ${selectedContactId === contact.conversation_id ? 'bg-[#F4F3F0]' : 'hover:bg-[#F4F3F0]'}`}
                >
                  <div className="h-10 w-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
                    {contact.type === 'group' ? <Users className="h-4 w-4" /> : '聊'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{contact.name}</h3>
                    <p className="text-xs text-gray-500 truncate">
                      {contact.type === 'group' ? '群聊' : '单聊'} · {contact.unread_count > 0 ? `${contact.unread_count} 条未读` : '已读'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#F9F9F8]">
          <div className="min-h-16 border-b border-gray-100 bg-white px-6 py-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center">
                  {selectedContact?.type === 'group' ? <Users className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{selectedContact?.name || '系统助手'}</h3>
                  <p className="text-[10px] text-[#4CAF50] font-bold uppercase tracking-wide">
                    {wsConnected ? '实时连接中' : '离线模式'}
                  </p>
                </div>
              </div>
            </div>

            {selectedContact?.type === 'group' && membersApiEnabled ? (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {activeMembers.map((member) => (
                    <span
                      key={member.user_id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-[#F4F3F0] text-gray-700"
                    >
                      {member.user_id}
                      {member.user_id !== currentUserId ? (
                        <button
                          type="button"
                          onClick={() => {
                            void handleRemoveMember(member.user_id);
                          }}
                          className="text-gray-500 hover:text-black"
                          aria-label={`移除成员 ${member.user_id}`}
                          title={`移除成员 ${member.user_id}`}
                          disabled={memberUpdating}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={addMembersInput}
                    onChange={(e) => setAddMembersInput(e.target.value)}
                    placeholder="添加成员 userId，逗号分隔"
                    className="flex-1 px-3 py-2 text-sm bg-[#F4F3F0] border border-gray-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void handleAddMembers();
                    }}
                    disabled={memberUpdating}
                    aria-label="添加群成员"
                    title="添加群成员"
                    className="px-3 py-2 bg-black text-white text-sm disabled:bg-gray-400"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeMessages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'student' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{msg.sender}</span>
                  <span className="text-[10px] text-gray-600">{msg.time}</span>
                </div>
                <div className={`px-4 py-3 max-w-[85%] text-sm whitespace-pre-wrap ${msg.role === 'student' ? 'bg-[#E0573D] text-white' : msg.role === 'assistant' ? 'bg-white text-gray-800 border border-gray-100' : 'bg-[#EEF4FF] text-gray-800 border border-[#DCE9FF]'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            {errorText ? <p className="text-xs text-red-600 mb-2">{errorText}</p> : null}
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    void handleSend();
                  }
                }}
                placeholder={selectedContact?.type === 'group' ? '输入群消息...' : '输入问题并发送，消息与 AI 记录将写入后端...'}
                className="w-full bg-[#F4F3F0] border-none pl-4 pr-12 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  void handleSend();
                }}
                disabled={sending || !input.trim()}
                aria-label="发送消息"
                title="发送消息"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black disabled:bg-gray-400 transition-colors"
              >
                {sending ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Send className="h-4 w-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
