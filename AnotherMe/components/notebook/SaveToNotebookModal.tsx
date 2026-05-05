'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, BookOpen, Loader2, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  saveChatToNote,
  listNotebooks,
  createNotebook,
  type Notebook,
  type ChatMessageForNote,
} from '@/lib/notebook/storage';
import { generateChatNoteTitle, generateNoteSummary } from '@/lib/notebook/summarize';

interface SaveToNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  onSaved?: (noteId: string) => void;
}

export function SaveToNotebookModal({ isOpen, onClose, messages, onSaved }: SaveToNotebookModalProps) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [showCreateNotebook, setShowCreateNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [messageRange, setMessageRange] = useState<'all' | 'last3' | 'last1'>('all');

  // 加载笔记本列表
  useEffect(() => {
    if (isOpen) {
      const nbs = listNotebooks();
      setNotebooks(nbs);
      if (nbs.length > 0 && !selectedNotebookId) {
        setSelectedNotebookId(nbs[0].id);
      }
      setSavedNoteId(null);
    }
  }, [isOpen, selectedNotebookId]);

  // 自动生成标题
  useEffect(() => {
    if (isOpen && !title && messages.length > 0) {
      setIsGeneratingTitle(true);
      generateChatNoteTitle(messages).then((generatedTitle) => {
        setTitle(generatedTitle);
        setIsGeneratingTitle(false);
      });
    }
  }, [isOpen, messages, title]);

  // 根据范围筛选消息
  const getFilteredMessages = useCallback((): ChatMessageForNote[] => {
    let filtered = [...messages];
    if (messageRange === 'last1') {
      // 获取最后一轮对话（最后一条用户消息和对应的AI回复）
      const lastUserIndex = messages.map((m, i) => ({ ...m, index: i }))
        .filter((m) => m.role === 'user')
        .pop()?.index;
      if (lastUserIndex !== undefined) {
        filtered = messages.slice(lastUserIndex);
      }
    } else if (messageRange === 'last3') {
      // 获取最近3轮对话
      const userIndices = messages.map((m, i) => ({ ...m, index: i }))
        .filter((m) => m.role === 'user')
        .slice(-3);
      if (userIndices.length > 0) {
        const startIndex = userIndices[0].index;
        filtered = messages.slice(startIndex);
      }
    }
    return filtered.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }, [messages, messageRange]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !selectedNotebookId) return;

    setIsSaving(true);
    try {
      const filteredMessages = getFilteredMessages();
      const note = saveChatToNote({
        title: title.trim(),
        messages: filteredMessages,
        notebookId: selectedNotebookId,
      });

      // 异步生成摘要
      generateNoteSummary({
        title: note.title,
        content: note.content,
        type: 'chat',
      }).then((summary) => {
        if (summary) {
          // 更新笔记摘要
          const { upsertNotebookNote } = require('@/lib/notebook/storage');
          upsertNotebookNote({
            ...note,
            summary,
          });
        }
      });

      setSavedNoteId(note.id);
      onSaved?.(note.id);

      // 2秒后自动关闭
      setTimeout(() => {
        onClose();
        setSavedNoteId(null);
      }, 1500);
    } catch (error) {
      console.error('Failed to save chat to notebook:', error);
    } finally {
      setIsSaving(false);
    }
  }, [title, selectedNotebookId, getFilteredMessages, onSaved, onClose]);

  const handleCreateNotebook = useCallback(() => {
    if (!newNotebookName.trim()) return;
    const notebook = createNotebook(newNotebookName.trim());
    setNotebooks((prev) => [...prev, notebook]);
    setSelectedNotebookId(notebook.id);
    setShowCreateNotebook(false);
    setNewNotebookName('');
  }, [newNotebookName]);

  const messageCount = getFilteredMessages().length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Save className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    保存到笔记
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    将对话保存到笔记本
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="px-6 py-4 space-y-4">
              {/* 保存成功提示 */}
              <AnimatePresence>
                {savedNoteId && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl"
                  >
                    <Check className="w-5 h-5" />
                    <span className="text-sm font-medium">保存成功！</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 标题输入 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  笔记标题
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="输入笔记标题..."
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700',
                      'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                      'transition-all text-sm'
                    )}
                  />
                  {isGeneratingTitle && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* 消息范围选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  消息范围
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: '全部消息', desc: `${messages.length} 条` },
                    { value: 'last3', label: '最近3轮', desc: '最近3轮对话' },
                    { value: 'last1', label: '最近1轮', desc: '最后1轮对话' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMessageRange(option.value as typeof messageRange)}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-xl border text-sm transition-all',
                        messageRange === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs opacity-70">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 笔记本选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  选择笔记本
                </label>
                <div className="space-y-2">
                  {notebooks.map((notebook) => (
                    <button
                      key={notebook.id}
                      onClick={() => setSelectedNotebookId(notebook.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                        selectedNotebookId === notebook.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                        style={{ backgroundColor: notebook.color }}
                      >
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {notebook.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {notebook.recordCount} 条记录
                        </div>
                      </div>
                      {selectedNotebookId === notebook.id && (
                        <Check className="w-5 h-5 text-blue-500" />
                      )}
                    </button>
                  ))}

                  {/* 创建新笔记本 */}
                  <AnimatePresence>
                    {showCreateNotebook ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={newNotebookName}
                          onChange={(e) => setNewNotebookName(e.target.value)}
                          placeholder="新笔记本名称..."
                          className={cn(
                            'flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700',
                            'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                            'text-sm'
                          )}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateNotebook();
                            if (e.key === 'Escape') setShowCreateNotebook(false);
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleCreateNotebook}
                          className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                          创建
                        </button>
                      </motion.div>
                    ) : (
                      <button
                        onClick={() => setShowCreateNotebook(true)}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed',
                          'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400',
                          'hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800',
                          'transition-all text-sm'
                        )}
                      >
                        <Plus className="w-4 h-4" />
                        创建新笔记本
                      </button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 预览信息 */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>将保存 {messageCount} 条消息</div>
                  <div>笔记类型：聊天记录</div>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={onClose}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700',
                  'text-gray-700 dark:text-gray-300 text-sm font-medium',
                  'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                )}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || isSaving || !!savedNoteId}
                className={cn(
                  'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium',
                  'bg-gradient-to-r from-blue-500 to-indigo-600 text-white',
                  'hover:from-blue-600 hover:to-indigo-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all flex items-center justify-center gap-2'
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : savedNoteId ? (
                  <>
                    <Check className="w-4 h-4" />
                    已保存
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    保存到笔记
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 导入 Plus 图标
import { Plus } from 'lucide-react';