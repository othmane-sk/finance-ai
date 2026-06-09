import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, Send, Trash2, History, Plus, Brain, User, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function ChatbotPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await api.get('/chat/sessions');
      setSessions(res.data);
      if (res.data.length > 0 && !activeSessionId) {
        handleLoadSession(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleLoadSession = async (sessionId) => {
    try {
      setLoading(true);
      setError('');
      setActiveSessionId(sessionId);
      const res = await api.get(`/chat/sessions/${sessionId}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      setError('Failed to load chat history.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewSession = () => {
    setMessages([]);
    setActiveSessionId(null);
    setError('');
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
    fetchSessions();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const suggestions = [
    "Combien de temps pour économiser 10000 MAD avec 4000 MAD de salaire ?",
    "Puis-je atteindre mon objectif d'ici décembre ?",
    "Analyse mes dépenses.",
    "Comment réduire mes dépenses alimentaires ?"
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Session Navigation (Left side) */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/60">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={handleCreateNewSession}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Discussion</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">Discussions</div>
          {sessionsLoading ? (
            <div className="text-center py-4 text-xs text-slate-400">Loading history...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-450">No chat history</div>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => handleLoadSession(s.id)}
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  activeSessionId === s.id
                    ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center space-x-2 truncate pr-2">
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
            ))
          )}
        </div>
      </aside>

      {/* Conversation Thread (Right side) */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/40">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-6">
                <Brain className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Finance AI Assistant</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Welcome to your premium chatbot interface. Ask me to audit your categories, build savings charts, or optimize monthly expense allocations.
              </p>
              
              <div className="grid grid-cols-1 gap-2.5 w-full">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputValue(s)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold text-left hover:border-indigo-500/30 hover:bg-indigo-500/[0.01] transition-all cursor-pointer shadow-sm"
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
              <div key={idx} className={`flex space-x-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                    <Brain className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                </div>
                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex space-x-3.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                <Brain className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-2 shadow-sm">
                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mr-1 animate-pulse">AI is thinking</span>
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center space-x-2 justify-center">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2 max-w-3xl mx-auto">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask the AI Finance assistant a question..."
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-800 dark:text-white rounded-xl placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white shadow shadow-indigo-600/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
