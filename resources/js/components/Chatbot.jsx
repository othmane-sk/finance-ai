import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, X, Send, Trash2, History, Plus, Brain } from 'lucide-react';
import api from '../services/api';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/chat/sessions');
      setSessions(res.data);
      if (res.data.length > 0 && !activeSessionId) {
        handleLoadSession(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadSession = async (sessionId) => {
    try {
      setLoading(true);
      setError('');
      setActiveSessionId(sessionId);
      const res = await api.get(`/chat/sessions/${sessionId}`);
      setMessages(res.data.messages || []);
      setShowHistory(false);
    } catch (err) {
      setError('Failed to load chat history.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewSession = () => {
    setMessages([]);
    setActiveSessionId(null);
    setShowHistory(false);
  };

  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setMessages([]);
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage = { sender: 'user', message: inputValue };
    setMessages(prev => [...prev, userMessage]);
    const prompt = inputValue;
    setInputValue('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/chatbot', {
        message: prompt,
        session_id: activeSessionId
      });
      const botMessage = { sender: 'bot', message: res.data.message };
      setMessages(prev => [...prev, botMessage]);
      if (res.data.session_id && !activeSessionId) {
        setActiveSessionId(res.data.session_id);
        fetchSessions();
      }
    } catch (err) {
      setError('Failed to get response from assistant.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const suggestions = [
    "What is my current monthly budget progress?",
    "How can I save more money this month?",
    "Show me a summary of my recent expenses.",
    "Give me tips to improve my financial health."
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-300 relative group"
        >
          <Sparkles className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform" />
          <span className="absolute right-16 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-[10px] uppercase font-bold tracking-wider opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-250 whitespace-nowrap shadow-xl">
            Ask Finance AI
          </span>
        </button>
      )}

      {/* Chat window panel */}
      {isOpen && (
        <div className="w-96 h-[520px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-display uppercase tracking-wide">Finance AI Assistant</h3>
                <p className="text-[10px] text-indigo-200 font-medium">Powered by Gemini AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Chat Sessions"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={handleCreateNewSession}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 flex flex-col space-y-3 min-h-0">
            {showHistory ? (
              /* Session History View */
              <div className="flex-1 flex flex-col space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Saved Sessions</div>
                {sessions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                    No active sessions found.
                  </div>
                ) : (
                  <div className="space-y-1.5 overflow-y-auto pr-1">
                    {sessions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => handleLoadSession(s.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          activeSessionId === s.id
                            ? 'bg-indigo-600/10 border-indigo-500 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{s.title || `Chat Session ${s.id}`}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Chat Messages View */
              <>
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4 animate-bounce">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Welcome to Finance AI</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[200px] mb-4">
                      Ask me anything about budgets, savings goals, insights or recent transactions!
                    </p>
                    <div className="grid grid-cols-1 gap-2 w-full">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInputValue(s)}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 hover:border-indigo-500/30 text-[10px] font-semibold text-slate-600 dark:text-slate-300 text-left hover:bg-indigo-500/[0.02] dark:hover:bg-indigo-500/[0.02] transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, idx) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                        isUser
                          ? 'self-end bg-indigo-600 text-white rounded-tr-none'
                          : 'self-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
                      }`}
                    >
                      {!isUser && (
                        <div className="flex items-center space-x-1.5 mb-1 text-indigo-500 dark:text-indigo-400 font-bold uppercase text-[9px] tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          <span>Finance AI</span>
                        </div>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center space-x-2 self-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 px-3.5 py-2.5 rounded-2xl rounded-tl-none">
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider animate-pulse mr-1">AI analyzing</span>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-[10px] text-center font-semibold">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef}></div>
              </>
            )}
          </div>

          {/* Footer Input */}
          {!showHistory && (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me a question..."
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-white rounded-xl placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow shadow-indigo-600/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
