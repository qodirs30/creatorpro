import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Edit3, Settings, LogOut, LayoutDashboard, Target, Wand2, Menu, X, Hash } from 'lucide-react';
import useAppStore from './store/useAppStore';
import './index.css';

// Components
import LockScreen from './components/LockScreen';
import Dashboard from './pages/Dashboard';
import ContentScripting from './pages/ContentScripting';
import DailyPlanner from './pages/DailyPlanner';
import AppSettings from './pages/Settings';
import SocialPlanner from './pages/SocialPlanner';
import HabitTracker from './pages/HabitTracker';
import MegaPrompt from './pages/MegaPrompt';
import ClickCounter from './pages/ClickCounter';

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { setIsLocked, enablePinLock } = useAppStore();

  const navItems = [
    { name: 'Beranda', path: '/', icon: <Home size={20} /> },
    { name: 'Pelacak Kebiasaan', path: '/habits', icon: <Target size={20} /> },
    { name: 'Mega Prompt', path: '/mega-prompt', icon: <Wand2 size={20} /> },
    { name: 'Click Counter', path: '/counter', icon: <Hash size={20} /> },
    { name: 'Penulis Naskah', path: '/scripting', icon: <Edit3 size={20} /> },
    { name: 'Perencana Konten', path: '/social', icon: <LayoutDashboard size={20} /> },
    { name: 'Jadwal Harian', path: '/planner', icon: <Calendar size={20} /> },
    { name: 'Pengaturan', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img 
            src="/logo.svg" 
            alt="Logo" 
            style={{ 
              width: '44px', 
              height: '44px', 
              objectFit: 'contain',
            }} 
          />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', lineHeight: 1.1 }}>
            qodirs<br/>
            <span style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>pro creator</span>
          </h2>
        </div>
        {/* Close button visible only on mobile */}
        <button
          onClick={onClose}
          className="sidebar-close-btn"
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.25rem'
          }}
          aria-label="Tutup menu"
        >
          <X size={22} />
        </button>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-secondary)',
              backgroundColor: location.pathname === item.path ? 'var(--primary-light)' : 'transparent',
              fontWeight: location.pathname === item.path ? '500' : '400',
              transition: 'all 0.2s'
            }}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      {enablePinLock && (
        <div style={{ marginTop: 'auto' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsLocked(true)}
            style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}
          >
            <LogOut size={20} />
            Kunci Aplikasi
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar-close-btn {
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar when route changes (on mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="app-container">
      {/* Mobile hamburger button - hidden when sidebar is open */}
      {!sidebarOpen && (
        <button
          className="mobile-menu-toggle"
          onClick={() => setSidebarOpen(true)}
          aria-label="Buka menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Overlay backdrop for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habits" element={<HabitTracker />} />
          <Route path="/mega-prompt" element={<MegaPrompt />} />
          <Route path="/counter" element={<ClickCounter />} />
          <Route path="/scripting" element={<ContentScripting />} />
          <Route path="/social" element={<SocialPlanner />} />
          <Route path="/planner" element={<DailyPlanner />} />
          <Route path="/settings" element={<AppSettings />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <LockScreen>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </LockScreen>
  );
}

export default App;
