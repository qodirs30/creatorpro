import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { generateCompanionChat } from '../utils/ai';
import { 
  Send, X, Mic, MicOff, Trash2, 
  Sparkles, MessageCircle 
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export default function FloatingSuki() {
  const location = useLocation();
  const { 
    memexChats, addMemexChat, clearMemexChats,
    memexCompanion, sukiKnowledge, memexCards,
    geminiKey, groqKey, openAiKey,
    aiProvider, aiModel
  } = useAppStore();

  const getApiKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return geminiKey;
  };

  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttentionDot, setShowAttentionDot] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);



  // Scroll to bottom on updates
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [memexChats, isOpen]);

  // Show attention dot if new chat messages arrive while closed
  useEffect(() => {
    if (!isOpen && memexChats.length > 0 && memexChats[memexChats.length - 1].role === 'assistant' && !showAttentionDot) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowAttentionDot(true);
    }
  }, [memexChats, isOpen, showAttentionDot]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'id-ID';

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setChatInput(prev => (prev + ' ' + transcript).trim());
        }
      };

      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Perekaman suara tidak didukung di browser ini. Harap gunakan Chrome atau browser modern.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }
  };

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    const userMsg = chatInput.trim();
    if (!userMsg || loadingChat) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      alert('API Key belum diatur! Harap atur API Key di menu Pengaturan.');
      return;
    }

    addMemexChat({ role: 'user', content: userMsg });
    setChatInput('');
    setLoadingChat(true);

    try {
      const recentCards = memexCards.slice(0, 5);
      const reply = await generateCompanionChat(
        apiKey,
        memexCompanion,
        memexChats.concat({ role: 'user', content: userMsg }),
        recentCards,
        userMsg,
        aiProvider,
        aiModel,
        sukiKnowledge?.content || ''
      );

      addMemexChat({ role: 'assistant', content: reply.trim() });
    } catch (err) {
      console.error(err);
      addMemexChat({ 
        role: 'assistant', 
        content: 'Duh sorry, otak AI gue lagi ngambek nih. Coba tanya lagi ya!' 
      });
    } finally {
      setLoadingChat(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Hapus riwayat obrolan dengan Suki?')) {
      clearMemexChats();
    }
  };

  const handleOpenWidget = () => {
    setIsOpen(true);
    setShowAttentionDot(false);
  };

  if (location.pathname === '/memex') {
    return null;
  }

  return (
    <>
      {/* Floating Chat Bubble Button */}
      {!isOpen && (
        <button
          onClick={handleOpenWidget}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
            cursor: 'pointer',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s',
            animation: showAttentionDot ? 'floatingPulse 2s infinite' : undefined,
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={`Mengobrol dengan ${memexCompanion.name}`}
        >
          <span>{memexCompanion.avatar || '🐱'}</span>
          
          {/* Notification Dot */}
          {showAttentionDot && (
            <span style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              border: '2px solid white',
            }} />
          )}
        </button>
      )}

      {/* Pop-up Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '360px',
            height: '520px',
            maxHeight: 'calc(100vh - 48px)',
            maxWidth: 'calc(100vw - 48px)',
            borderRadius: '20px',
            background: 'rgba(13, 14, 21, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Outfit', sans-serif",
            animation: 'slideUpWidget 0.25s cubic-bezier(0.165, 0.84, 0.44, 1) forwards'
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.75rem' }}>{memexCompanion.avatar || '🐱'}</span>
              <div>
                <h4 style={{ margin: 0, color: 'white', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {memexCompanion.name}
                  {sukiKnowledge?.content && <Sparkles size={12} color="#c084fc" title="Dilengkapi Katalog Toko" />}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Co-Thinker Online</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {memexChats.length > 0 && (
                <button
                  onClick={handleClearChat}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                  title="Hapus riwayat obrolan"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
                title="Tutup Obrolan"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {memexChats.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 1rem', fontSize: '0.85rem' }}>
                <MessageCircle size={36} color="var(--primary)" style={{ opacity: 0.4, marginBottom: '0.75rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
                <span>Hai! Gue {memexCompanion.name}.{sukiKnowledge?.content ? ' Katalog laptop toko lo udah gue inget nih!' : ' Ada yang mau diobrolin?'}</span>
              </div>
            ) : (
              memexChats.map(chat => (
                <div
                  key={chat.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: chat.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: chat.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: chat.role === 'user' 
                        ? 'linear-gradient(135deg, var(--primary), var(--accent))' 
                        : 'rgba(255, 255, 255, 0.06)',
                      color: 'white',
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      wordBreak: 'break-word',
                      border: chat.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <MarkdownRenderer text={chat.content} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px', alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {new Date(chat.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}

            {/* AI Typing Loading Indicator */}
            {loadingChat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start' }}>
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: '16px 16px 16px 4px', background: 'rgba(255, 255, 255, 0.06)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span className="dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8', animation: 'bounceDot 1.4s infinite ease-in-out' }} />
                  <span className="dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8', animation: 'bounceDot 1.4s infinite ease-in-out 0.2s' }} style={{ animationDelay: '0.2s' }} />
                  <span className="dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8', animation: 'bounceDot 1.4s infinite ease-in-out 0.4s' }} style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendChat}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(0, 0, 0, 0.2)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            {/* Voice input */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              style={{
                background: isRecording ? '#ef4444' : 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                color: isRecording ? 'white' : '#94a3b8',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={isRecording ? 'Berhenti Merekam' : 'Tulis dengan Suara'}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Text input */}
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={isRecording ? 'Mendengarkan...' : `Ketik pesan ke ${memexCompanion.name}...`}
              disabled={loadingChat}
              style={{
                flex: 1,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'white',
                borderRadius: '18px',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!chatInput.trim() || loadingChat}
              style={{
                background: chatInput.trim() && !loadingChat 
                  ? 'linear-gradient(135deg, var(--primary), var(--accent))' 
                  : 'rgba(255, 255, 255, 0.06)',
                color: chatInput.trim() && !loadingChat ? 'white' : '#64748b',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: chatInput.trim() && !loadingChat ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Global CSS Inject */}
      <style>{`
        @keyframes floatingPulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); transform: scale(1); }
          70% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); transform: scale(1); }
        }
        @keyframes slideUpWidget {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bounceDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
