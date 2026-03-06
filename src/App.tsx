/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Loader2, 
  PlusCircle, 
  MessageSquare,
  ChevronRight,
  Settings,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export default function App() {
  const [input, setInput] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with a new session if none exist
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, isLoading]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Math.random().toString(36).substring(7),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setInput('');
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0]?.id || null);
      }
      return filtered;
    });
    if (sessions.length <= 1) {
      createNewSession();
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !activeSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Update session with user message
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const updatedMessages = [...s.messages, userMessage];
        // Update title if it's the first message
        const title = s.messages.length === 0 ? userMessage.content.slice(0, 30) + (userMessage.content.length > 30 ? '...' : '') : s.title;
        return { ...s, messages: updatedMessages, title };
      }
      return s;
    }));

    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      // Prepare history for context
      const history = activeSession?.messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })) || [];

      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: "You are Bhavik AI, a helpful, intelligent, and friendly AI assistant. Your responses should be clear, concise, and professional yet approachable. You are powered by Google's Gemini models but your name is Bhavik AI.",
        },
      });

      // Send message
      const result = await chat.sendMessage({ message: userMessage.content });
      const responseText = result.text;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...s.messages, aiMessage] };
        }
        return s;
      }));
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: [...s.messages, errorMessage] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="h-full bg-zinc-900/30 border-r border-white/5 flex flex-col overflow-hidden"
      >
        <div className="p-4 flex flex-col h-full">
          <button 
            onClick={createNewSession}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-sm font-medium mb-6"
          >
            <PlusCircle size={18} className="text-indigo-400" />
            New Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-2 mb-2">Recent Chats</h3>
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-xl transition-all group relative",
                  activeSessionId === session.id ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20" : "text-zinc-400 hover:bg-white/5"
                )}
              >
                <MessageSquare size={16} className={activeSessionId === session.id ? "text-indigo-400" : "text-zinc-500"} />
                <span className="text-sm truncate flex-1 text-left">{session.title}</span>
                <Trash2 
                  size={14} 
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-opacity" 
                  onClick={(e) => deleteSession(session.id, e)}
                />
              </button>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-white/5">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                B
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Bhavik AI User</p>
                <p className="text-[10px] text-zinc-500 truncate">Free Tier</p>
              </div>
              <Settings size={16} className="text-zinc-500" />
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-all"
            >
              <ChevronRight className={cn("transition-transform", isSidebarOpen && "rotate-180")} size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <h1 className="font-display font-bold text-lg tracking-tight">
                Bhavik <span className="gradient-text">AI</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">System Online</span>
            </div>
            <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-400">
              <MoreVertical size={20} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar"
        >
          {activeSession?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-3xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30"
              >
                <Sparkles size={40} className="text-indigo-400" />
              </motion.div>
              <div className="space-y-4">
                <h2 className="text-4xl font-display font-bold tracking-tight">
                  How can I help you today?
                </h2>
                <p className="text-zinc-500 text-lg">
                  I'm Bhavik AI, your intelligent companion. Ask me anything from writing code to planning your next trip.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {[
                  { icon: "💡", text: "Explain quantum computing in simple terms" },
                  { icon: "📝", text: "Write a professional email to my manager" },
                  { icon: "🎨", text: "Suggest a color palette for a modern dashboard" },
                  { icon: "🚀", text: "How do I start a career in AI development?" }
                ].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(suggestion.text)}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left group"
                  >
                    <span className="text-xl mb-2 block">{suggestion.icon}</span>
                    <p className="text-sm text-zinc-300 group-hover:text-white transition-colors">{suggestion.text}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 pb-32">
              <AnimatePresence mode="popLayout">
                {activeSession?.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4 md:gap-6",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-xl flex-shrink-0 flex items-center justify-center",
                      message.role === 'user' ? "bg-zinc-800" : "bg-indigo-600"
                    )}>
                      {message.role === 'user' ? <User size={18} /> : <Bot size={20} />}
                    </div>
                    <div className={cn(
                      "flex-1 space-y-2",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      <div className={cn(
                        "inline-block max-w-full rounded-2xl p-4 md:p-5 text-sm md:text-base",
                        message.role === 'user' 
                          ? "bg-indigo-600/20 border border-indigo-500/20 text-zinc-100" 
                          : "bg-zinc-900/50 border border-white/5 text-zinc-300"
                      )}>
                        <div className="markdown-body">
                          <Markdown>{message.content}</Markdown>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4 md:gap-6"
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="h-4 bg-zinc-800 rounded-full w-3/4 shimmer" />
                    <div className="h-4 bg-zinc-800 rounded-full w-1/2 shimmer" />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 shadow-2xl focus-within:border-indigo-500/50 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Bhavik AI anything..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-100 placeholder-zinc-500 py-3 px-4 resize-none max-h-48 custom-scrollbar"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-3 rounded-xl transition-all flex-shrink-0",
                  input.trim() && !isLoading 
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20" 
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
            <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-widest font-medium">
              Bhavik AI may display inaccurate info, including about people, so double-check its responses.
            </p>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
