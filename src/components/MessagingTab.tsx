/**
 * @file src/components/MessagingTab.tsx
 * @description Real-time Consultation Messaging and Direct Inquiry Interface.
 * Handles bidirectional chat threads between Customers and Financial Service Providers.
 * Supports auto-reply bot responses, unread counters, auto-scrolling to latest message,
 * and responsive split-pane/mobile single-thread layout views.
 * 
 * Target Roles: Customer and Provider.
 * Closely depended on by: App.tsx (rendered under 'messages' tab or triggered by 'Message Provider' CTA).
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  Bot, 
  Check, 
  CheckCheck, 
  ChevronLeft, 
  Sparkles, 
  Building2, 
  ShieldCheck,
  AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, ChatThread, UserAccount } from '../types';
import { dbService } from '../services/dataService';

/**
 * Component props for MessagingTab.
 */
interface MessagingTabProps {
  /** Authenticated user account participating in conversations */
  currentUser: UserAccount;
  /** Optional pre-selected thread identifier passed from external action (e.g. from provider profile) */
  activeThreadId?: string | null;
  key?: React.Key;
}

/**
 * Direct Messaging & Consultation Workspace Component
 */
export function MessagingTab({ currentUser, activeThreadId }: MessagingTabProps) {
  const isProvider = currentUser.role === 'provider';

  // Active user's conversation threads
  const [threads, setThreads] = useState<ChatThread[]>([]);
  // Currently opened chat thread
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  // Chronological message history for selected thread
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Message composition input text
  const [inputText, setInputText] = useState('');
  // Search query to filter thread contacts
  const [searchFilter, setSearchFilter] = useState('');

  // Scroll anchor ref for auto-scrolling to latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Loads user's conversation threads from persistence,
   * selecting the active thread or defaulting to the first available.
   */
  const loadThreads = () => {
    const list = dbService.getThreadsForUser(currentUser.userId);
    setThreads(list);

    if (activeThreadId) {
      const match = list.find(t => t.threadId === activeThreadId);
      if (match) setSelectedThread(match);
      else if (list.length > 0 && !selectedThread) setSelectedThread(list[0]);
    } else if (list.length > 0 && !selectedThread) {
      setSelectedThread(list[0]);
    }
  };


  useEffect(() => {
    loadThreads();
  }, [currentUser.userId, activeThreadId]);

  // Load messages whenever selectedThread changes
  useEffect(() => {
    if (selectedThread) {
      const msgs = dbService.getMessagesForThread(selectedThread.threadId);
      setMessages(msgs);
    }
  }, [selectedThread?.threadId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check target partner availability
  const isTargetAvailable = selectedThread ? (
    isProvider 
      ? (dbService.getUsers().find(u => u.userId === selectedThread.userId)?.status === 'active')
      : dbService.isProviderPubliclyVisible(selectedThread.providerId)
  ) : true;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedThread || !isTargetAvailable) return;

    const { userMsg, autoReplyMsg } = dbService.sendMessage(
      selectedThread.threadId,
      currentUser,
      inputText.trim()
    );

    setInputText('');
    setMessages(prev => [...prev, userMsg, ...(autoReplyMsg ? [autoReplyMsg] : [])]);
    loadThreads();
  };

  const filteredThreads = threads.filter(t => {
    const partnerName = isProvider ? t.userName : t.providerName;
    return partnerName.toLowerCase().includes(searchFilter.toLowerCase());
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-170px)] md:h-[calc(100vh-220px)] min-h-[480px] flex flex-col md:flex-row"
    >
      {/* Threads Sidebar / Left Panel */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col h-full ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 md:p-6 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xl text-trust-blue flex items-center gap-2">
              <MessageSquare className="text-success-green" size={22} />
              Messaging Inbox
            </h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-trust-blue"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 no-scrollbar">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <MessageSquare size={36} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No direct messages yet.</p>
              <p className="text-[10px] mt-1">Contact an expert from Search or Home to start chat.</p>
            </div>
          ) : (
            filteredThreads.map(t => {
              const partnerName = isProvider ? t.userName : t.providerName;
              const partnerAvatar = isProvider ? t.userAvatar : t.providerAvatar;
              const partnerSub = isProvider ? 'Client' : t.providerTitle;
              const isSelected = selectedThread?.threadId === t.threadId;
              const isAvailable = isProvider 
                ? (dbService.getUsers().find(u => u.userId === t.userId)?.status === 'active')
                : dbService.isProviderPubliclyVisible(t.providerId);

              return (
                <button
                  key={t.threadId}
                  onClick={() => setSelectedThread(t)}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${isSelected ? 'bg-trust-blue/5 border-l-4 border-trust-blue' : 'hover:bg-slate-50'}`}
                >
                  <img
                    src={partnerAvatar || 'https://picsum.photos/seed/avatar/200/200'}
                    alt={partnerName}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-sm text-trust-blue truncate">{partnerName}</h4>
                      <span className="text-[9px] font-medium text-slate-400 shrink-0">{t.lastTimestamp}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] text-slate-400 font-semibold truncate">{partnerSub}</p>
                      {!isAvailable && (
                        <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-gray truncate font-medium">{t.lastMessage}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Window / Right Panel */}
      {selectedThread ? (
        <div className={`flex-1 flex flex-col h-full bg-slate-50/50 ${selectedThread ? 'flex' : 'hidden md:flex'}`}>
          {/* Chat Header */}
          <div className="p-4 md:px-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedThread(null)}
                className="md:hidden p-1.5 rounded-lg bg-slate-100 text-slate-600"
              >
                <ChevronLeft size={20} />
              </button>
              <img
                src={(isProvider ? selectedThread.userAvatar : selectedThread.providerAvatar) || 'https://picsum.photos/seed/user/200/200'}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h4 className="font-bold text-sm text-trust-blue">
                  {isProvider ? selectedThread.userName : selectedThread.providerName}
                </h4>
                <div className="text-[10px] text-slate-gray font-medium flex items-center gap-1.5">
                  <span>{isProvider ? 'Client' : `${selectedThread.providerTitle}`}</span>
                  {(() => {
                    if (isProvider) {
                      return <ShieldCheck size={12} className="text-success-green" />;
                    }
                    if (isTargetAvailable) {
                      return <ShieldCheck size={12} className="text-amber-500" title="eKYC Verified" />;
                    }
                    return (
                      <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 border border-red-200 rounded flex items-center gap-1">
                        <AlertTriangle size={10} /> Currently Unavailable
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Provider Auto-Reply Setting Indicator */}
            {isProvider && (
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Bot size={14} className="text-trust-blue" />
                <span className="text-[10px] font-bold text-trust-blue">Bot Auto-Reply Active</span>
              </div>
            )}
          </div>

          {/* Unavailable Notice Banner */}
          {!isTargetAvailable && (
            <div className="p-3 bg-red-50 border-b border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2 shrink-0">
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
              <span>
                This provider is currently unavailable (unverified or account suspended). You can view past messages, but new messages cannot be sent.
              </span>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
            {messages.map(msg => {
              const isMe = msg.senderId === currentUser.userId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl text-xs md:text-sm shadow-sm space-y-1 relative ${
                      isMe
                        ? 'bg-trust-blue text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                    }`}
                  >
                    {msg.isAutoReply && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded-md mb-1.5">
                        <Bot size={10} /> Auto-reply
                      </div>
                    )}
                    <p className="leading-relaxed">{msg.text}</p>
                    <div className={`text-[9px] text-right font-medium mt-1 ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
            <input
              type="text"
              disabled={!isTargetAvailable}
              placeholder={
                isTargetAvailable 
                  ? `Type message to ${isProvider ? selectedThread.userName : selectedThread.providerName}...` 
                  : "Messaging disabled for unavailable provider."
              }
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm font-semibold outline-none focus:border-trust-blue disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!isTargetAvailable}
              className="px-5 py-3 bg-trust-blue hover:bg-trust-blue/90 text-white rounded-2xl font-bold text-xs flex items-center gap-1 shadow-md shadow-trust-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Send</span>
              <Send size={14} />
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center p-8 text-center bg-slate-50/50">
          <div>
            <MessageSquare size={48} className="mx-auto text-slate-300 mb-2" />
            <h4 className="font-bold text-trust-blue">Select a conversation</h4>
            <p className="text-xs text-slate-gray mt-1">Choose a direct message thread from the left list.</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
