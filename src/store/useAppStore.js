import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAppStore = create(
  persist(
    (set) => ({
      // Keamanan
      isLocked: true, 
      setIsLocked: (locked) => set({ isLocked: locked }),
      pin: '1234', 
      setPin: (newPin) => set({ pin: newPin }),
      enablePinLock: false,
      setEnablePinLock: (enabled) => set({ enablePinLock: enabled }),

      // Firebase Authentication & Sync
      firebaseUser: null,
      setFirebaseUser: (user) => set({ firebaseUser: user }),
      isAuthActive: false,
      setIsAuthActive: (active) => set({ isAuthActive: active }),

      // Kunci API AI Berdasarkan Penyedia
      geminiKey: '', setGeminiKey: (k) => set({ geminiKey: k }),
      groqKey: '', setGroqKey: (k) => set({ groqKey: k }),
      openAiKey: '', setOpenAiKey: (k) => set({ openAiKey: k }),
      klingKey: '', setKlingKey: (k) => set({ klingKey: k }), // legacy, deprecated
      klingAccessKey: '', setKlingAccessKey: (k) => set({ klingAccessKey: k }),
      klingSecretKey: '', setKlingSecretKey: (k) => set({ klingSecretKey: k }),
      
      // Default Provider untuk Teks
      aiProvider: 'qodirsai', 
      setAiProvider: (provider) => set({ aiProvider: provider }),
      aiModel: 'gemini-2.5-flash',
      setAiModel: (model) => set({ aiModel: model }),
      
      // Kebiasaan & Kewajiban
      habits: [],
      addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
      updateHabit: (id, updates) => set((state) => ({
        habits: state.habits.map(h => h.id === id ? { ...h, ...updates } : h)
      })),
      deleteHabit: (id) => set((state) => ({
        habits: state.habits.filter(h => h.id !== id)
      })),
      
      // Log Aktivitas (Untuk Statistik Analitik)
      // Format: { id: string, type: 'habit' | 'task', title: string, date: string (ISO) }
      activityLog: [],
      logActivity: (activity) => set((state) => ({
        activityLog: [...state.activityLog, { ...activity, date: new Date().toISOString() }]
      })),
      removeActivityLog: (id, type) => set((state) => {
        // Hapus entri log terbaru untuk item ini (jika user un-check)
        const logs = [...state.activityLog];
        for (let i = logs.length - 1; i >= 0; i--) {
          if (logs[i].id === id && logs[i].type === type) {
            logs.splice(i, 1);
            break;
          }
        }
        return { activityLog: logs };
      }),
      
      // Naskah Konten
      scripts: [],
      addScript: (script) => set((state) => ({ scripts: [...state.scripts, script] })),

      // ================= SOCIAL PLANNER =================
      socialColumns: [
        { id: 'idea', title: 'Ide', emoji: '💡', color: '#f59e0b' },
        { id: 'draft', title: 'Draf', emoji: '✍️', color: '#6366f1' },
        { id: 'scheduled', title: 'Dijadwalkan', emoji: '📅', color: '#8b5cf6' },
        { id: 'published', title: 'Diterbitkan', emoji: '✅', color: '#10b981' },
      ],
      setSocialColumns: (cols) => set({ socialColumns: cols }),
      addSocialColumn: (col) => set((state) => ({ socialColumns: [...state.socialColumns, col] })),
      updateSocialColumn: (id, updates) => set((state) => ({
        socialColumns: state.socialColumns.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      deleteSocialColumn: (id) => set((state) => ({
        socialColumns: state.socialColumns.filter(c => c.id !== id),
        socialPosts: state.socialPosts.filter(p => p.status !== id),
      })),

      socialPosts: [],
      addSocialPost: (post) => set((state) => ({
        socialPosts: [...state.socialPosts, { id: Date.now().toString(), createdAt: new Date().toISOString(), ...post }]
      })),
      updateSocialPost: (id, updates) => set((state) => ({
        socialPosts: state.socialPosts.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      deleteSocialPost: (id) => set((state) => ({
        socialPosts: state.socialPosts.filter(p => p.id !== id)
      })),

      // ================= CLICK COUNTERS =================
      counters: [],
      addCounter: (counter) => set((state) => ({
        counters: [...state.counters, {
          id: Date.now().toString(),
          name: counter.name || 'Counter Baru',
          count: counter.count || 0,
          step: counter.step || 1,
          target: counter.target || null,
          color: counter.color || '#4f46e5',
          createdAt: new Date().toISOString(),
          ...counter,
        }]
      })),
      updateCounter: (id, updates) => set((state) => ({
        counters: state.counters.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      incrementCounter: (id) => set((state) => ({
        counters: state.counters.map(c => c.id === id ? { ...c, count: c.count + (c.step || 1) } : c)
      })),
      decrementCounter: (id) => set((state) => ({
        counters: state.counters.map(c => c.id === id ? { ...c, count: Math.max(0, c.count - (c.step || 1)) } : c)
      })),
      resetCounter: (id) => set((state) => ({
        counters: state.counters.map(c => c.id === id ? { ...c, count: 0 } : c)
      })),
      deleteCounter: (id) => set((state) => ({
        counters: state.counters.filter(c => c.id !== id)
      })),

      // ================= MEMEX JOURNAL & COMPANION =================
      memexCards: [],
      addMemexCard: (card) => set((state) => ({
        memexCards: [
          {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            ...card
          },
          ...state.memexCards
        ]
      })),
      deleteMemexCard: (id) => set((state) => ({
        memexCards: state.memexCards.filter(c => String(c.id) !== String(id))
      })),
      setMemexCards: (cards) => set({ memexCards: cards }),
      updateMemexCard: (id, updates) => set((state) => ({
        memexCards: state.memexCards.map(c => {
          if (String(c.id) === String(id)) {
            const mergedData = (updates.data && c.data) ? { ...c.data, ...updates.data } : (updates.data || c.data);
            return { ...c, ...updates, data: mergedData };
          }
          return c;
        })
      })),
      memexCompanion: {
        name: 'Suki',
        avatar: '🐱',
        mode: 'default', // 'default' | 'custom'
        preset: 'bad', // 'good' | 'bad'
        personalityPrompt: 'Kamu suka bercanda dan selalu santai.',
        customHardPrompt: '',
        customPrompt: "Kamu adalah Suki (Bad Suki). Kamu adalah teman gaul yang sarkas, usil, super kocak, ceplas-ceplos, suka menyindir bercanda, dan menggunakan bahasa gaul kekinian (gue, lo). Meskipun suka meledek atau 'roast' pengguna secara bercanda, kamu tetap sangat kompeten, pintar, dan siap membantu segala pencatatan jurnal dengan cermat. Kepribadian tambahan: Kamu suka bercanda dan selalu santai."
      },
      updateMemexCompanion: (updates) => set((state) => ({
        memexCompanion: { ...state.memexCompanion, ...updates }
      })),
      memexChats: [],
      addMemexChat: (chat) => set((state) => ({
        memexChats: [...state.memexChats, { id: Date.now().toString(), timestamp: new Date().toISOString(), ...chat }]
      })),
      clearMemexChats: () => set({ memexChats: [] }),

      // ================= BASIS PENGETAHUAN SUKI =================
      sukiKnowledge: { content: '', updatedAt: new Date(0).toISOString() },
      setSukiKnowledge: (content) => set({
        sukiKnowledge: { content, updatedAt: new Date().toISOString() }
      }),

      // ================= HISTORY / JEJAK AKTIVITAS =================
      // Format: { id, type, category, title, content, meta, date }
      // type: 'mega-prompt' | 'script' | 'habit' | 'task' | 'social' | 'image-analysis' | etc
      history: [],
      addHistory: (entry) => set((state) => {
        const newEntry = {
          id: (Date.now() + Math.random()).toString(36),
          date: new Date().toISOString(),
          ...entry,
        };
        // Cap history to last 200 items to avoid localStorage bloat
        const updated = [newEntry, ...state.history].slice(0, 200);
        return { history: updated };
      }),
      deleteHistory: (id) => set((state) => ({
        history: state.history.filter(h => h.id !== id)
      })),
      clearHistory: () => set({ history: [] }),
      restoreBackup: (data) => set({
        memexCards: data.memexCards || [],
        habits: data.habits || [],
        scripts: data.scripts || [],
        socialPosts: data.socialPosts || [],
        counters: data.counters || [],
        activityLog: data.activityLog || [],
        history: data.history || [],
        sukiKnowledge: data.sukiKnowledge || { content: '', updatedAt: new Date(0).toISOString() },
        memexChats: data.memexChats || [],
        geminiKey: data.geminiKey || '',
        groqKey: data.groqKey || '',
        openAiKey: data.openAiKey || '',
        klingAccessKey: data.klingAccessKey || '',
        klingSecretKey: data.klingSecretKey || '',
        aiProvider: data.aiProvider || 'qodirsai',
        aiModel: data.aiModel || 'gemini-2.5-flash',
        enablePinLock: data.enablePinLock ?? false,
        pin: data.pin || '1234',
      }),
    }),
    {
      name: 'qodirsai-storage-v1', // Ganti nama agar reset jika skema berubah drastis
      partialize: (state) => {
        const rest = { ...state };
        delete rest.firebaseUser;
        return rest;
      }
    }
  )
);

export default useAppStore;
