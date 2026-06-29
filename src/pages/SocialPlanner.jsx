import { useState } from 'react';
import useAppStore from '../store/useAppStore';
import { Plus, X, Edit2, Trash2, Settings, ChevronRight, ChevronLeft, Calendar, Tag, FileText } from 'lucide-react';
const EMOJI_PRESETS = ['💡', '✍️', '📅', '✅', '🎬', '🎨', '📸', '🎯', '🚀', '🔥', '⭐', '📝', '💭', '📣', '🎙️', '⏸️'];

export default function SocialPlanner() {
  const {
    socialColumns, addSocialColumn, updateSocialColumn, deleteSocialColumn,
    socialPosts, addSocialPost, updateSocialPost, deleteSocialPost,
    addHistory,
  } = useAppStore();

  const [showManageColumns, setShowManageColumns] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showAddPost, setShowAddPost] = useState(false);
  const [addPostColumn, setAddPostColumn] = useState(null);

  // Add Column state
  const [newColTitle, setNewColTitle] = useState('');
  const [newColEmoji, setNewColEmoji] = useState('📝');
  const [newColColor, setNewColColor] = useState('#6366f1');

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const id = newColTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
    addSocialColumn({ id, title: newColTitle.trim(), emoji: newColEmoji, color: newColColor });
    setNewColTitle('');
    setNewColEmoji('📝');
    setNewColColor('#6366f1');
  };

  const handleDeleteColumn = (id) => {
    const postCount = socialPosts.filter(p => p.status === id).length;
    const msg = postCount > 0 
      ? `Hapus kolom ini? ${postCount} konten di dalamnya juga akan terhapus.`
      : 'Hapus kolom ini?';
    if (window.confirm(msg)) {
      deleteSocialColumn(id);
    }
  };

  const handleSavePost = (data) => {
    if (editingPost?.id) {
      updateSocialPost(editingPost.id, data);
    } else {
      addSocialPost(data);
      addHistory({
        type: 'social',
        category: 'Konten Baru',
        title: data.title,
        content: data.notes || '',
      });
    }
    setEditingPost(null);
    setShowAddPost(false);
    setAddPostColumn(null);
  };

  const movePost = (id, newStatus) => {
    updateSocialPost(id, { status: newStatus });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Perencana Konten</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Board fleksibel — kustom kolom, tambah konten, atur alurnya sesuka kamu.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowManageColumns(!showManageColumns)}
          >
            <Settings size={16} /> {showManageColumns ? 'Tutup' : 'Kelola Kolom'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { setAddPostColumn(socialColumns[0]?.id); setShowAddPost(true); }}
          >
            <Plus size={16} /> Tambah Konten
          </button>
        </div>
      </div>

      {/* Manage Columns Panel */}
      {showManageColumns && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--bg-main)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Kelola Kolom / Status</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {socialColumns.map(col => (
              <ColumnEditor
                key={col.id}
                column={col}
                onUpdate={(updates) => updateSocialColumn(col.id, updates)}
                onDelete={() => handleDeleteColumn(col.id)}
              />
            ))}
          </div>

          {/* Add column form */}
          <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>Tambah Kolom Baru</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Nama</label>
                <input
                  type="text"
                  className="input-field"
                  value={newColTitle}
                  placeholder="misal: Review / Shooting / Upload"
                  onChange={(e) => setNewColTitle(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Emoji</label>
                <select className="input-field" value={newColEmoji} onChange={(e) => setNewColEmoji(e.target.value)} style={{ width: '70px', fontSize: '1.1rem' }}>
                  {EMOJI_PRESETS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block' }}>Warna</label>
                <input
                  type="color"
                  value={newColColor}
                  onChange={(e) => setNewColColor(e.target.value)}
                  style={{ width: '44px', height: '40px', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}
                />
              </div>
              <button className="btn btn-primary" onClick={handleAddColumn} disabled={!newColTitle.trim()}>
                <Plus size={16} /> Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {socialColumns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Belum ada kolom. Buat kolom pertama untuk mulai perencanaan.</p>
          <button className="btn btn-primary" onClick={() => setShowManageColumns(true)}>
            <Settings size={16} /> Buat Kolom
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {socialColumns.map(col => {
            const colPosts = socialPosts.filter(p => p.status === col.id);
            return (
              <div
                key={col.id}
                style={{
                  minWidth: '280px',
                  maxWidth: '320px',
                  flex: '1 0 280px',
                  background: 'var(--bg-main)',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  borderTop: `4px solid ${col.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{col.emoji}</span>
                    {col.title}
                    <span style={{ color: col.color, fontWeight: 700 }}>({colPosts.length})</span>
                  </h3>
                  <button
                    onClick={() => { setAddPostColumn(col.id); setShowAddPost(true); }}
                    style={{ background: 'transparent', border: 'none', color: col.color, cursor: 'pointer', padding: '0.25rem' }}
                    title="Tambah ke kolom ini"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {colPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem 0.5rem', fontSize: '0.825rem', border: '2px dashed var(--border-color)', borderRadius: '10px' }}>
                      Belum ada konten
                    </div>
                  ) : (
                    colPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        columns={socialColumns}
                        onEdit={() => setEditingPost(post)}
                        onDelete={() => {
                          if (window.confirm(`Hapus konten "${post.title}"?`)) deleteSocialPost(post.id);
                        }}
                        onMove={(newStatus) => movePost(post.id, newStatus)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Post Modal */}
      {(showAddPost || editingPost) && (
        <PostModal
          post={editingPost}
          defaultColumn={addPostColumn || socialColumns[0]?.id}
          columns={socialColumns}
          onSave={handleSavePost}
          onClose={() => { setEditingPost(null); setShowAddPost(false); setAddPostColumn(null); }}
        />
      )}
    </div>
  );
}

// ============== Column Editor (inline) ==============
function ColumnEditor({ column, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [emoji, setEmoji] = useState(column.emoji);
  const [color, setColor] = useState(column.color);

  const handleSave = () => {
    onUpdate({ title: title.trim() || column.title, emoji, color });
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <input type="text" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="input-field" value={emoji} onChange={(e) => setEmoji(e.target.value)} style={{ width: '60px' }}>
          {EMOJI_PRESETS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '40px', height: '36px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }} />
        <button className="btn btn-primary" onClick={handleSave} style={{ padding: '0.4rem 0.75rem' }}>Simpan</button>
        <button className="btn btn-secondary" onClick={() => setEditing(false)} style={{ padding: '0.4rem 0.75rem' }}>Batal</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-card)', borderRadius: '8px', border: `1px solid var(--border-color)`, borderLeft: `4px solid ${column.color}` }}>
      <span style={{ fontSize: '1.25rem' }}>{column.emoji}</span>
      <span style={{ flex: 1, fontWeight: 500 }}>{column.title}</span>
      <button onClick={() => setEditing(true)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }} title="Edit">
        <Edit2 size={16} />
      </button>
      <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }} title="Hapus">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ============== Post Card ==============
function PostCard({ post, columns, onEdit, onDelete, onMove }) {
  const currentIdx = columns.findIndex(c => c.id === post.status);
  const prevCol = currentIdx > 0 ? columns[currentIdx - 1] : null;
  const nextCol = currentIdx < columns.length - 1 ? columns[currentIdx + 1] : null;
  const currentCol = columns[currentIdx];

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: '10px',
        padding: '0.85rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid var(--border-color)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.35, flex: 1 }}>{post.title}</h4>
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }} title="Edit">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }} title="Hapus">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {post.platform && (
          <span style={{ fontSize: '0.7rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Tag size={10} /> {post.platform}
          </span>
        )}
        {post.scheduledDate && (
          <span style={{ fontSize: '0.7rem', background: '#ede9fe', color: '#7c3aed', padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Calendar size={10} /> {new Date(post.scheduledDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
          </span>
        )}
        {post.notes && (
          <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.5rem', borderRadius: '99px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <FileText size={10} /> Notes
          </span>
        )}
      </div>

      {/* Move buttons */}
      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
        <button
          onClick={() => prevCol && onMove(prevCol.id)}
          disabled={!prevCol}
          style={{
            flex: 1, background: 'transparent', border: '1px solid var(--border-color)',
            color: prevCol ? currentCol?.color : 'var(--text-secondary)',
            cursor: prevCol ? 'pointer' : 'not-allowed',
            opacity: prevCol ? 1 : 0.4,
            padding: '0.3rem', borderRadius: '6px', fontSize: '0.7rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px'
          }}
          title={prevCol ? `Pindah ke ${prevCol.title}` : 'Kolom pertama'}
        >
          <ChevronLeft size={12} /> {prevCol?.title.slice(0, 10) || '—'}
        </button>
        <button
          onClick={() => nextCol && onMove(nextCol.id)}
          disabled={!nextCol}
          style={{
            flex: 1, background: 'transparent', border: '1px solid var(--border-color)',
            color: nextCol ? currentCol?.color : 'var(--text-secondary)',
            cursor: nextCol ? 'pointer' : 'not-allowed',
            opacity: nextCol ? 1 : 0.4,
            padding: '0.3rem', borderRadius: '6px', fontSize: '0.7rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px'
          }}
          title={nextCol ? `Pindah ke ${nextCol.title}` : 'Kolom terakhir'}
        >
          {nextCol?.title.slice(0, 10) || '—'} <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ============== Add/Edit Post Modal ==============
function PostModal({ post, defaultColumn, columns, onSave, onClose }) {
  const [title, setTitle] = useState(post?.title || '');
  const [platform, setPlatform] = useState(post?.platform || '');
  const [status, setStatus] = useState(post?.status || defaultColumn);
  const [scheduledDate, setScheduledDate] = useState(post?.scheduledDate || '');
  const [notes, setNotes] = useState(post?.notes || '');
  const [hashtags, setHashtags] = useState(post?.hashtags || '');

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      platform: platform.trim(),
      status,
      scheduledDate: scheduledDate || null,
      notes: notes.trim(),
      hashtags: hashtags.trim(),
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0 }}>{post ? 'Edit Konten' : 'Tambah Konten Baru'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Judul Konten *</label>
            <input
              type="text"
              className="input-field"
              placeholder="misal: 3 Tips Produktivitas Anti Mager"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Platform</label>
              <input
                type="text"
                className="input-field"
                placeholder="TikTok / IG Reels / YT Shorts"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Status</label>
              <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
                {columns.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Tanggal Rilis (opsional)</label>
            <input
              type="date"
              className="input-field"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Catatan / Deskripsi</label>
            <textarea
              className="input-field"
              rows="3"
              placeholder="Ide, script singkat, atau catatan produksi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>Hashtags (opsional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="#produktivitas #tipsanak #viral"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!title.trim()}>
              {post ? 'Simpan Perubahan' : 'Tambah'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
