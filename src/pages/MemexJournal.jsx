import React, { useState, useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';
import { 
  Sparkles, Trash2, Send, Calendar, DollarSign, 
  User, Quote, FileText, MessageSquare, Key, X, 
  Settings, RefreshCw, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { extractMemexCard, generateCompanionChat } from '../utils/ai';

export default function MemexJournal() {
  const { 
    memexCards, addMemexCard, deleteMemexCard,
    memexCompanion, updateMemexCompanion,
    memexChats, addMemexChat, clearMemexChats,
    geminiKey, groqKey, openAiKey,
    aiProvider, aiModel 
  } = useAppStore();

  const [textCapture, setTextCapture] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loadingCapture, setLoadingCapture] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [mobileActiveView, setMobileActiveView] = useState('journal'); // 'journal' | 'chat'

  // Kustomisasi Companion
  const [compName, setCompName] = useState(memexCompanion.name);
  const [compAvatar, setCompAvatar] = useState(memexCompanion.avatar);
  const [compPrompt, setCompPrompt] = useState(memexCompanion.customPrompt);

  const chatEndRef = useRef(null);

  // Dapatkan API key yang aktif
  const getApiKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return null;
  };

  const apiKey = getApiKey();

  // Scroll otomatis ke chat terakhir
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [memexChats, loadingChat]);

  const handleCaptureSubmit = async (e) => {
    e.preventDefault();
    if (!textCapture.trim() || loadingCapture) return;

    if (!apiKey) {
      alert('API Key belum dikonfigurasi! Harap atur API Key Anda di menu Pengaturan.');
      return;
    }

    setLoadingCapture(true);
    try {
      // Ekstrak data terstruktur menggunakan AI
      const result = await extractMemexCard(apiKey, textCapture, aiProvider, aiModel);
      
      // Tambahkan ke store
      addMemexCard({
        type: result.type || 'note',
        title: result.title || 'Catatan Jurnal',
        tags: result.tags || ['jurnal'],
        data: result.data || { summary: textCapture },
        companionComment: result.companionComment || 'Tercatat!'
      });

      // Tambahkan reaksi Companion ke obrolan chat otomatis
      if (result.companionComment) {
        addMemexChat({
          role: 'assistant',
          content: `*[Mengomentari: ${result.title}]* ${result.companionComment}`
        });
      }

      setTextCapture('');
    } catch (err) {
      console.error(err);
      alert('Gagal mengekstrak kartu: ' + err.message);
    } finally {
      setLoadingCapture(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || loadingChat) return;

    if (!apiKey) {
      alert('API Key belum dikonfigurasi! Harap atur API Key Anda di menu Pengaturan.');
      return;
    }

    const userMsg = chatInput.trim();
    addMemexChat({ role: 'user', content: userMsg });
    setChatInput('');
    setLoadingChat(true);

    try {
      // Sediakan memori kartu-kartu teratas (max 5) untuk konteks AI
      const recentCards = memexCards.slice(0, 5);

      // Generate respon companion chat
      const reply = await generateCompanionChat(
        apiKey,
        memexCompanion,
        memexChats.concat({ role: 'user', content: userMsg }),
        recentCards,
        userMsg,
        aiProvider,
        aiModel
      );

      addMemexChat({ role: 'assistant', content: reply.trim() });
    } catch (err) {
      console.error(err);
      addMemexChat({ role: 'assistant', content: 'Duh sorry, koneksi AI gue lagi error nih. Coba tanya lagi entar ya!' });
    } finally {
      setLoadingChat(false);
    }
  };

  const handleSaveCompanion = () => {
    updateMemexCompanion({
      name: compName,
      avatar: compAvatar,
      customPrompt: compPrompt
    });
    setIsConfiguring(false);
  };

  // Format tanggal lokalisasi
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format nominal rupiah
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Filter kartu berdasarkan tab aktif
  const filteredCards = memexCards.filter(card => {
    if (activeTab === 'all') return true;
    return card.type === activeTab;
  });

  const cardIcons = {
    task: <CheckCircle2 size={16} color="#8b5cf6" />,
    transaction: <DollarSign size={16} color="#ef4444" />,
    note: <FileText size={16} color="#06b6d4" />,
    quote: <Quote size={16} color="#f59e0b" />,
    contact: <User size={16} color="#10b981" />
  };

  const avatarsList = ['🐱', '🤖', '🦊', '🦉', '🦁', '🐸', '👾', '✨'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
      {/* Header Utama */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient responsive-title" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Sparkles size={32} color="var(--primary)" /> Memex AI Capture
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Tangkap fragmen hari Anda dan biarkan AI mengorganisirnya secara terstruktur.
          </p>
        </div>
      </div>

      {/* Banner Peringatan jika API Key belum diatur */}
      {!apiKey && (
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#fef2f2', borderLeft: '4px solid var(--danger)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <AlertCircle size={28} color="var(--danger)" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ color: '#991b1b', margin: 0 }}>API Key Belum Ditemukan!</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#b91c1c' }}>
              Fitur penataan jurnal otomatis memerlukan API Key yang aktif. Silakan buka halaman <a href="/settings" style={{ textDecoration: 'underline', fontWeight: 'bold', color: 'var(--danger)' }}>Pengaturan</a> untuk menyetel kunci API.
            </p>
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="mobile-view-tabs">
        <button 
          className={`mobile-tab-btn ${mobileActiveView === 'journal' ? 'active' : ''}`}
          onClick={() => setMobileActiveView('journal')}
          type="button"
        >
          <FileText size={16} /> Jurnal & Capture
        </button>
        <button 
          className={`mobile-tab-btn ${mobileActiveView === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileActiveView('chat')}
          type="button"
        >
          <MessageSquare size={16} /> Chat Companion
        </button>
      </div>

      {/* Panel Utama Layout */}
      <div className={`memex-layout ${mobileActiveView === 'journal' ? 'journal-active' : 'chat-active'}`}>
        
        {/* Kolom Kiri: Input Capture & Card Feeds */}
        <div className="memex-layout-left">
          
          {/* Form Quick Capture */}
          <div className="card" style={{ marginBottom: '2rem', borderTop: '4px solid var(--primary)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="var(--primary)" /> Tulis Fragmen Hari Ini
            </h3>
            <form onSubmit={handleCaptureSubmit} className="memex-capture-form">
              <input
                type="text"
                className="input-field"
                placeholder="Contoh: beli kopi habis 35000, ingatkan jam 8 malam rapat RT, quote: be yourself"
                value={textCapture}
                onChange={(e) => setTextCapture(e.target.value)}
                disabled={loadingCapture}
                style={{ flex: 1 }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loadingCapture || !textCapture.trim()}
                style={{ padding: '0 1.5rem', whiteSpace: 'nowrap' }}
              >
                {loadingCapture ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Ekstraksi...
                  </>
                ) : (
                  <>
                    Kirim <Send size={16} />
                  </>
                )}
              </button>
            </form>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              AI akan otomatis menebak apakah ini tugas, catatan keuangan, kontak, kutipan, atau memo biasa.
            </p>
          </div>

          {/* Tab Filter Kartu */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {[
              { id: 'all', label: 'Semua Kartu' },
              { id: 'task', label: 'Tugas' },
              { id: 'transaction', label: 'Keuangan' },
              { id: 'note', label: 'Catatan' },
              { id: 'quote', label: 'Kutipan' },
              { id: 'contact', label: 'Kontak' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  backgroundColor: activeTab === tab.id ? 'var(--primary-light)' : 'var(--bg-card)',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                  border: activeTab === tab.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List Feeds Kartu */}
          <div className="memex-feed">
            {filteredCards.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <FileText size={48} style={{ opacity: 0.25, marginBottom: '1rem', color: 'var(--text-secondary)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Belum ada kartu untuk filter ini. Coba tulis fragmen baru di atas!
                </p>
              </div>
            ) : (
              filteredCards.map(card => (
                <div key={card.id} className={`card memex-card card-${card.type}`} style={{ padding: '1.25rem 1.5rem' }}>
                  <div className="memex-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {cardIcons[card.type] || <FileText size={16} />}
                      <span className="memex-card-type">{card.type}</span>
                    </div>
                    <button
                      onClick={() => deleteMemexCard(card.id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      title="Hapus Kartu"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                    {card.title}
                  </h3>

                  {/* Render Data Spesifik Berdasarkan Tipe */}
                  <div className="memex-card-body" style={{ color: 'var(--text-primary)' }}>
                    {card.type === 'transaction' && (
                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                          <strong>Nominal:</strong> <span style={{ color: card.data.type === 'expense' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                            {card.data.type === 'expense' ? '-' : '+'} {formatCurrency(card.data.amount)}
                          </span>
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Kategori: {card.data.category} | Tipe: {card.data.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                        </p>
                      </div>
                    )}

                    {card.type === 'task' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input type="checkbox" readOnly checked={false} style={{ cursor: 'not-allowed' }} />
                          <span>{card.data.todo}</span>
                        </p>
                        {card.data.dueDate && (
                          <p style={{ margin: '0.25rem 0 0 1.25rem', fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={12} /> Tenggat: {card.data.dueDate}
                          </p>
                        )}
                      </div>
                    )}

                    {card.type === 'quote' && (
                      <blockquote style={{ borderLeft: '3px solid #cbd5e1', paddingLeft: '0.75rem', margin: '0.5rem 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                        "{card.data.quote}"
                        <cite style={{ display: 'block', fontStyle: 'normal', fontWeight: '600', fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                          — {card.data.author || 'Anonim'}
                        </cite>
                      </blockquote>
                    )}

                    {card.type === 'contact' && (
                      <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>
                          <strong>Nama:</strong> {card.data.name}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                          <strong>Hubungan:</strong> {card.data.relationship}
                        </p>
                        {card.data.context && (
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <strong>Catatan:</strong> {card.data.context}
                          </p>
                        )}
                      </div>
                    )}

                    {card.type === 'note' && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        {card.data.summary}
                      </p>
                    )}
                  </div>

                  {/* Render Tags */}
                  {card.tags && card.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      {card.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Companion Reaction Bubble */}
                  {card.companionComment && (
                    <div className="memex-reaction-bubble">
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)', marginRight: '0.25rem' }}>
                        {memexCompanion.avatar} {memexCompanion.name}:
                      </span>
                      {card.companionComment}
                    </div>
                  )}

                  <div className="memex-card-footer">
                    <span>{formatDate(card.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Kolom Kanan: AI Companion Box & Settings */}
        <div className="memex-companion-panel">
          
          {/* Companion Profile Card */}
          <div className="card" style={{ borderTop: '4px solid var(--accent)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyStyle: 'space-between', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2.25rem' }}>{memexCompanion.avatar}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{memexCompanion.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    Companion ({memexCompanion.personality})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsConfiguring(!isConfiguring)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                title="Kustomisasi AI Companion"
              >
                {isConfiguring ? <X size={18} /> : <Settings size={18} />}
              </button>
            </div>

            {/* Panel Kustomisasi Companion */}
            {isConfiguring ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'slideUpFade 0.2s ease-out forwards', paddingBottom: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Nama Karakter</label>
                  <input
                    type="text"
                    className="input-field"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    style={{ padding: '0.5rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Avatar Emoji</label>
                  <div className="avatar-selector">
                    {avatarsList.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        className={`avatar-btn ${compAvatar === emoji ? 'selected' : ''}`}
                        onClick={() => setCompAvatar(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem' }}>Prompt Karakter (Personality)</label>
                  <textarea
                    className="input-field"
                    value={compPrompt}
                    onChange={(e) => setCompPrompt(e.target.value)}
                    rows={4}
                    style={{ padding: '0.5rem', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button className="btn btn-primary" onClick={handleSaveCompanion} style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>
                    Simpan
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsConfiguring(false)} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                "{memexCompanion.customPrompt.substring(0, 75)}..."
              </p>
            )}
          </div>

          {/* Companion Chat Box */}
          <div className="companion-chat-box">
            {/* Header Chat */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={14} color="var(--accent)" /> Chat dengan {memexCompanion.name}
              </span>
              {memexChats.length > 0 && (
                <button 
                  onClick={clearMemexChats}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Clear Chat
                </button>
              )}
            </div>

            {/* Gelembung Pesan */}
            <div className="companion-chat-messages">
              {memexChats.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  <span>Mulailah menyapa {memexCompanion.name}! Dia ingat jurnal harianmu di sebelah kiri.</span>
                </div>
              ) : (
                memexChats.map(chat => (
                  <div key={chat.id} className={`chat-bubble ${chat.role}`}>
                    {chat.role === 'assistant' ? (
                      <div>
                        {chat.content}
                      </div>
                    ) : (
                      chat.content
                    )}
                  </div>
                ))
              )}

              {/* Animasi Mengetik */}
              {loadingChat && (
                <div className="chat-bubble companion" style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0.5rem 0.75rem' }}>
                  <div className="pulsing-dot"></div>
                  <div className="pulsing-dot"></div>
                  <div className="pulsing-dot"></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form Chat */}
            <form onSubmit={handleSendChat} className="companion-chat-input">
              <input
                type="text"
                className="input-field"
                placeholder={`Kirim pesan ke ${memexCompanion.name}...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={loadingChat}
                style={{ padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loadingChat || !chatInput.trim()}
                style={{ padding: '0.5rem', borderRadius: '8px' }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
