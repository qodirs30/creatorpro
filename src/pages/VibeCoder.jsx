import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { generateContent } from '../utils/ai';
import { 
  Terminal, Code, Clipboard, Download, Play, RefreshCw, Zap, 
  ShieldAlert, Sparkles, Paintbrush, FileText, CheckCircle2
} from 'lucide-react';

export default function VibeCoder() {
  const { geminiKey, groqKey, openAiKey, aiProvider, aiModel, addHistory } = useAppStore();

  // Tabs
  const [activeTab, setActiveTab] = useState('pedoman'); // 'pedoman' | 'token-killer' | 'inspector'

  // Tab 1: Pedoman Proyek State
  const [theme, setTheme] = useState('Toko Kopi Online');
  const [aesthetic, setAesthetic] = useState('glassmorphism'); // 'glassmorphism' | 'neobrutalism' | 'minimalist' | 'cyberpunk'
  const [designSystem, setDesignSystem] = useState('none'); // 'none' | 'stripe' | 'linear' | 'vercel' | 'apple' | 'supabase' | 'figma' | 'obsidian' | 'things' | 'discord' | 'slack' | 'raycast'
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [specialNotes, setSpecialNotes] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [designMd, setDesignMd] = useState('');
  const [styleMd, setStyleMd] = useState('');
  const [promptMd, setPromptMd] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('design'); // 'design' | 'style' | 'prompt'
  const [copiedText, setCopiedText] = useState(false);
  const [pedomanError, setPedomanError] = useState('');

  // Tab 2: Token Killer State
  const [rawLogs, setRawLogs] = useState('');
  const [compressedLogs, setCompressedLogs] = useState('');
  const [logType, setLogType] = useState('auto'); // 'auto' | 'git' | 'vite' | 'test' | 'linter' | 'general'
  const [isCompressing, setIsCompressing] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [stats, setStats] = useState(null);

  // Tab 3: URL Design Inspector State
  const [targetUrl, setTargetUrl] = useState('');
  const [manualHtml, setManualHtml] = useState('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectorResult, setInspectorResult] = useState('');
  const [inspectorError, setInspectorError] = useState('');
  const [isProxyFailed, setIsProxyFailed] = useState(false);

  const getApiKey = () => {
    if (aiProvider === 'gemini') return geminiKey;
    if (aiProvider === 'groq') return groqKey;
    if (aiProvider === 'openai') return openAiKey;
    return geminiKey;
  };

  // Dynamic Styles for Mockup Preview
  const getMockupStyles = () => {
    // If a design system reference is selected, override with specific design system styles
    if (designSystem !== 'none') {
      switch (designSystem) {
        case 'stripe':
          return {
            container: {
              background: 'linear-gradient(135deg, #f6f9fc 0%, #eef2f7 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              minHeight: '220px'
            },
            card: {
              background: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              padding: '1.25rem',
              color: '#32325d',
              boxShadow: '0 15px 35px rgba(50, 50, 93, 0.1), 0 5px 15px rgba(0, 0, 0, 0.07)',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'Inter', sans-serif"
            },
            title: {
              color: '#1a1f36',
              fontWeight: '700',
              fontSize: '1.15rem',
              letterSpacing: '-0.01em',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#697386',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#4f566b',
              borderBottom: '1px solid #f6f9fc',
              paddingBottom: '0.5rem',
              marginBottom: '1rem'
            },
            button: {
              background: '#5469d4',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontWeight: '600',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)'
            }
          };
        case 'linear':
          return {
            container: {
              background: '#09080f',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              minHeight: '220px'
            },
            card: {
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '1.25rem',
              color: '#ffffff',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'Inter', sans-serif"
            },
            title: {
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#b4bcd0',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#8a8f98',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              paddingBottom: '0.5rem',
              marginBottom: '1rem'
            },
            button: {
              background: '#5e6ad2',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '500',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'vercel':
          return {
            container: {
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid #eaeaea',
              minHeight: '220px'
            },
            card: {
              background: '#ffffff',
              border: '1px solid #000000',
              borderRadius: '0px',
              padding: '1.25rem',
              color: '#000000',
              boxShadow: '0px 0px 0px 1px #000000',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'Inter', sans-serif"
            },
            title: {
              color: '#000000',
              fontWeight: '700',
              fontSize: '1.15rem',
              letterSpacing: '-0.03em',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#666666',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#444444',
              borderBottom: '1px solid #eaeaea',
              paddingBottom: '0.5rem',
              marginBottom: '1rem'
            },
            button: {
              background: '#000000',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '0px',
              fontWeight: '600',
              border: '1px solid #000000',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'apple':
          return {
            container: {
              background: '#f5f5f7',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '220px'
            },
            card: {
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '18px',
              padding: '1.5rem',
              color: '#1d1d1f',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            },
            title: {
              color: '#1d1d1f',
              fontWeight: '600',
              fontSize: '1.2rem',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#86868b',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#515154',
              borderBottom: '1px solid #e8e8ed',
              paddingBottom: '0.5rem',
              marginBottom: '1rem'
            },
            button: {
              background: '#0071e3',
              color: '#ffffff',
              padding: '0.6rem 1rem',
              borderRadius: '980px',
              fontWeight: '500',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'supabase':
          return {
            container: {
              background: '#1c1c1c',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid #2e2e2e',
              minHeight: '220px'
            },
            card: {
              background: '#171717',
              border: '1px solid #2e2e2e',
              borderRadius: '6px',
              padding: '1.25rem',
              color: '#ededed',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'Inter', sans-serif"
            },
            title: {
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '1.15rem',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#888888',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#3ecf8e',
              borderBottom: '1px solid #2e2e2e',
              paddingBottom: '0.5rem',
              marginBottom: '1rem'
            },
            button: {
              background: '#3ecf8e',
              color: '#000000',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontWeight: '600',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'figma':
          return {
            container: {
              background: '#2c2c2c',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '220px'
            },
            card: {
              background: '#1e1e1e',
              border: '1px solid #333333',
              borderRadius: '6px',
              padding: '1.25rem',
              color: '#e6e6e6',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'Inter', sans-serif"
            },
            title: {
              color: '#ffffff',
              fontWeight: '500',
              fontSize: '1.1rem',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#b3b3b3',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#e6e6e6',
              background: '#2c2c2c',
              padding: '0.4rem',
              borderRadius: '4px',
              marginBottom: '1rem'
            },
            button: {
              background: '#0c8ce9',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '500',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'obsidian':
          return {
            container: {
              background: '#161618',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid #202022',
              minHeight: '220px'
            },
            card: {
              background: '#202022',
              border: '1px solid #343438',
              borderRadius: '6px',
              padding: '1.25rem',
              color: '#e3e3e3',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'Inter', sans-serif"
            },
            title: {
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '1.15rem',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#9a9a9a',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#8b5cf6',
              borderBottom: '1px solid #343438',
              paddingBottom: '0.5rem',
              marginBottom: '1rem'
            },
            button: {
              background: '#7c3aed',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontWeight: '500',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'things':
          return {
            container: {
              background: '#f4f4f6',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '220px'
            },
            card: {
              background: '#ffffff',
              border: '1px solid #e5e5e7',
              borderRadius: '12px',
              padding: '1.25rem',
              color: '#3a3a3c',
              boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
            },
            title: {
              color: '#1c1c1e',
              fontWeight: '600',
              fontSize: '1.15rem',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#8e8e93',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: '#34c759',
              fontWeight: '600',
              marginBottom: '1rem'
            },
            button: {
              background: '#2f80ed',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '600',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'discord':
          return {
            container: {
              background: '#202225',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '220px'
            },
            card: {
              background: '#2f3136',
              borderRadius: '8px',
              padding: '1.25rem',
              color: '#dcddde',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'GG Sans', 'Noto Sans', sans-serif"
            },
            title: {
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '1.1rem',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#b9bbbe',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#b9bbbe',
              background: '#202225',
              padding: '0.5rem',
              borderRadius: '4px',
              marginBottom: '1rem'
            },
            button: {
              background: '#5865f2',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '3px',
              fontWeight: '500',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'slack':
          return {
            container: {
              background: '#f8f8f8',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid #e8e8e8',
              minHeight: '220px'
            },
            card: {
              background: '#ffffff',
              border: '1px solid #dddddd',
              borderRadius: '8px',
              padding: '1.25rem',
              color: '#1d1c1d',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'Slack-Lato', Lato, sans-serif"
            },
            title: {
              color: '#1d1c1d',
              fontWeight: '900',
              fontSize: '1.15rem',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#616061',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#e01e5a',
              fontWeight: 'bold',
              borderLeft: '3px solid #e01e5a',
              paddingLeft: '0.5rem',
              marginBottom: '1rem'
            },
            button: {
              background: '#007a5a',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontWeight: '700',
              border: 'none',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
        case 'raycast':
          return {
            container: {
              background: 'radial-gradient(circle at top, #2b273f 0%, #151324 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              minHeight: '220px'
            },
            card: {
              background: 'rgba(23, 22, 38, 0.7)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
              color: '#f3f4f6',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              width: '100%',
              maxWidth: '300px',
              fontFamily: "'Inter', sans-serif"
            },
            title: {
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '1.1rem',
              marginBottom: '0.25rem',
              display: 'block'
            },
            subtitle: {
              color: '#a1a1aa',
              fontSize: '0.75rem',
              marginBottom: '1rem',
              display: 'block'
            },
            stat: {
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#ff62b0',
              fontWeight: '600',
              marginBottom: '1rem'
            },
            button: {
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: '600',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.8rem',
              width: '100%',
              cursor: 'pointer'
            }
          };
      }
    }

    // Default aesthetic styling
    switch (aesthetic) {
      case 'neobrutalism':
        return {
          container: {
            background: '#fef08a',
            padding: '1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '2px solid #000000',
            minHeight: '220px'
          },
          card: {
            background: '#ffffff',
            border: '3px solid #000000',
            borderRadius: '0px',
            padding: '1.25rem',
            color: '#000000',
            boxShadow: '5px 5px 0px #000000',
            width: '100%',
            maxWidth: '300px',
            fontFamily: "'Outfit', sans-serif"
          },
          title: {
            color: '#000000',
            fontWeight: '900',
            fontSize: '1.2rem',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
            display: 'block'
          },
          subtitle: {
            color: '#4b5563',
            fontSize: '0.8rem',
            fontWeight: '600',
            marginBottom: '1rem',
            display: 'block'
          },
          stat: {
            border: '2px solid #000000',
            padding: '0.4rem',
            background: '#f3f4f6',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '1rem'
          },
          button: {
            background: primaryColor,
            color: '#ffffff',
            padding: '0.5rem 1rem',
            fontWeight: 'bold',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px #000000',
            borderRadius: '0px',
            width: '100%',
            cursor: 'pointer'
          }
        };
      case 'minimalist':
        return {
          container: {
            background: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid #e5e7eb',
            minHeight: '220px'
          },
          card: {
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '1.25rem',
            color: '#1f2937',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            width: '100%',
            maxWidth: '300px',
            fontFamily: "'Outfit', sans-serif"
          },
          title: {
            color: '#111827',
            fontWeight: '600',
            fontSize: '1.15rem',
            letterSpacing: '-0.01em',
            marginBottom: '0.25rem',
            display: 'block'
          },
          subtitle: {
            color: '#6b7280',
            fontSize: '0.75rem',
            marginBottom: '1rem',
            display: 'block'
          },
          stat: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#4b5563',
            borderBottom: '1px solid #f3f4f6',
            paddingBottom: '0.5rem',
            marginBottom: '1rem'
          },
          button: {
            background: primaryColor,
            color: '#ffffff',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontWeight: '500',
            border: 'none',
            fontSize: '0.8rem',
            width: '100%',
            cursor: 'pointer'
          }
        };
      case 'cyberpunk':
        return {
          container: {
            background: '#030712',
            padding: '1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid #1f2937',
            minHeight: '220px'
          },
          card: {
            background: '#090d16',
            border: `2px solid ${primaryColor}`,
            borderRadius: '4px',
            padding: '1.25rem',
            color: '#00ffcc',
            boxShadow: `0 0 12px ${primaryColor}77`,
            width: '100%',
            maxWidth: '300px',
            fontFamily: "'Courier New', Courier, monospace"
          },
          title: {
            color: '#00ffcc',
            fontWeight: '700',
            fontSize: '1.1rem',
            textShadow: '0 0 6px #00ffcc66',
            letterSpacing: '1px',
            marginBottom: '0.5rem',
            display: 'block'
          },
          subtitle: {
            color: '#ff0055',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            marginBottom: '1rem',
            display: 'block'
          },
          stat: {
            fontSize: '0.7rem',
            color: '#9ca3af',
            border: '1px solid #1f2937',
            padding: '0.3rem',
            background: '#0b0f19',
            marginBottom: '1rem'
          },
          button: {
            background: 'transparent',
            color: '#00ffcc',
            padding: '0.5rem 1rem',
            fontWeight: 'bold',
            border: '2px solid #00ffcc',
            boxShadow: '0 0 8px #00ffcc44',
            borderRadius: '4px',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            width: '100%',
            cursor: 'pointer'
          }
        };
      case 'glassmorphism':
      default:
        return {
          container: {
            background: 'radial-gradient(circle at top left, #1e1b4b, #09090b)',
            padding: '1.5rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '220px'
          },
          card: {
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '1.25rem',
            color: '#ffffff',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.3)',
            width: '100%',
            maxWidth: '300px',
            fontFamily: "'Outfit', sans-serif"
          },
          title: {
            color: primaryColor,
            fontWeight: '700',
            fontSize: '1.15rem',
            textShadow: `0 0 8px ${primaryColor}55`,
            marginBottom: '0.25rem',
            display: 'block'
          },
          subtitle: {
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: '0.75rem',
            marginBottom: '1rem',
            display: 'block'
          },
          stat: {
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '1rem'
          },
          button: {
            background: `linear-gradient(135deg, ${primaryColor}, #8b5cf6)`,
            color: '#ffffff',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontWeight: '600',
            border: 'none',
            boxShadow: `0 4px 10px ${primaryColor}33`,
            fontSize: '0.8rem',
            width: '100%',
            cursor: 'pointer'
          }
        };
    }
  };

  // Tab 1: Generate Guidelines
  const handleGenerateGuidelines = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setPedomanError('API Key belum diatur. Harap konfigurasi API Key di menu Pengaturan.');
      return;
    }

    setIsGenerating(true);
    setPedomanError('');
    setDesignMd('');
    setStyleMd('');
    setPromptMd('');

    const systemPrompt = `Kamu adalah seorang Vibe Coding Architect senior. Tugasmu adalah membuat pedoman proyek terstruktur untuk vibe coding agar bisa di-copy paste ke workspace AI Coding Assistant (Cursor / Copilot / Claude Code / Kiro).

Pengguna memberikan spesifikasi berikut:
- Tema/Nama Proyek: "${theme}"
- Estetika/Style Desain: "${aesthetic}"
- Referensi Design System (ihlamury): "${designSystem !== 'none' ? designSystem : 'Tidak ada'}"
- Warna Utama: "${primaryColor}"
- Catatan Khusus: "${specialNotes}"

Hasilkan tiga dokumen spesifik:
1. design.md: Panduan arsitektur layout, komponen inti, struktur folder, tipografi, dan petunjuk UX (masukkan prinsip-prinsip desain dari referensi design system "${designSystem}" jika terpilih).
2. style.md: Kode CSS (custom properties), class utility, scrollbar, animations, dan class pendukung estetika "${aesthetic}" (serta kelas penunjang untuk design system "${designSystem}" jika terpilih).
3. prompt.md: System instructions / prompt developer untuk AI coding assistant agar mematuhi design.md dan style.md ini secara ketat.

Kembalikan jawaban dengan format pemisah yang sangat ketat seperti ini:

===DESIGN===
[Isi design.md di sini]
===STYLE===
[Isi style.md di sini]
===PROMPT===
[Isi prompt.md di sini]

Pastikan isi setiap bagian ditulis dalam bahasa Indonesia yang profesional (kecuali kode teknis) dan sangat detail. Tanpa teks pembuka atau penutup lain di luar pembatas tersebut.`;

    try {
      const response = await generateContent(apiKey, systemPrompt, aiProvider, aiModel);
      
      // Parse response
      const parts = response.split(/===\s*(DESIGN|STYLE|PROMPT)\s*===/i);
      let design = '';
      let style = '';
      let prompt = '';
      
      for (let i = 1; i < parts.length; i += 2) {
        const section = parts[i].toUpperCase();
        const content = parts[i + 1]?.trim() || '';
        if (section === 'DESIGN') design = content;
        else if (section === 'STYLE') style = content;
        else if (section === 'PROMPT') prompt = content;
      }

      // If parsing failed (AI missed placeholders), put entire output in design
      if (!design && !style && !prompt) {
        design = response;
      }

      setDesignMd(design);
      setStyleMd(style);
      setPromptMd(prompt);

      // Log to history
      addHistory({
        type: 'vibe-assets',
        category: 'Pedoman Vibe',
        title: `Asset untuk ${theme}`,
        content: `design.md & style.md generated for theme: ${theme}`,
        meta: { theme, aesthetic, designSystem, primaryColor }
      });
    } catch (err) {
      setPedomanError(err.message || 'Gagal menghasilkan pedoman proyek.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPedoman = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadPedoman = (filename, text) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tab 2: Token Killer Log Compression logic
  const handleCompressLogs = () => {
    if (!rawLogs.trim()) return;

    setIsCompressing(true);
    
    setTimeout(() => {
      let lines = rawLogs.split('\n');
      let detectedType = logType;

      if (logType === 'auto') {
        const textLower = rawLogs.toLowerCase();
        if (textLower.includes('on branch') || textLower.includes('changes not staged') || textLower.includes('untracked files') || textLower.includes('git status')) {
          detectedType = 'git';
        } else if (textLower.includes('vite') || textLower.includes('transforming (') || textLower.includes('built in') || textLower.includes('building for production')) {
          detectedType = 'vite';
        } else if (textLower.includes('test suites:') || textLower.includes('tests:') || textLower.includes('fail') || textLower.includes('pass')) {
          detectedType = 'test';
        } else if (textLower.includes('eslint') || textLower.includes('ts(') || textLower.includes('error ts') || textLower.includes('linter') || textLower.includes('warning:')) {
          detectedType = 'linter';
        } else {
          detectedType = 'general';
        }
      }

      let compressed;

      if (detectedType === 'git') {
        let branch = 'unknown';
        let modified = [];
        let untracked = [];
        let deleted = [];
        let added = [];
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('On branch ')) {
            branch = trimmed.replace('On branch ', '');
          } else if (trimmed.includes('modified:')) {
            modified.push(trimmed.split('modified:')[1].trim());
          } else if (trimmed.includes('deleted:')) {
            deleted.push(trimmed.split('deleted:')[1].trim());
          } else if (trimmed.includes('new file:')) {
            added.push(trimmed.split('new file:')[1].trim());
          } else if (trimmed.startsWith('use "git add') || trimmed.startsWith('(') || trimmed.startsWith('use "git restore')) {
            // Skip instruction
          } else if (trimmed && !trimmed.toLowerCase().includes('changes to be committed') && !trimmed.toLowerCase().includes('changes not staged') && !trimmed.toLowerCase().includes('untracked files') && !trimmed.includes('no changes added to commit')) {
            if (line.startsWith('\t') || line.startsWith('    ')) {
              untracked.push(trimmed);
            }
          }
        });

        let parts = [`[Git Status] Branch: ${branch}`];
        if (added.length > 0) parts.push(`Added: [${added.join(', ')}]`);
        if (modified.length > 0) parts.push(`Modified: [${modified.join(', ')}]`);
        if (deleted.length > 0) parts.push(`Deleted: [${deleted.join(', ')}]`);
        if (untracked.length > 0) parts.push(`Untracked: [${untracked.join(', ')}]`);
        if (parts.length === 1) parts.push('Working tree clean');
        compressed = parts.join('\n');
      } 
      else if (detectedType === 'vite') {
        let buildLines = [];
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.includes('transforming (')) return;
          if (trimmed) buildLines.push(trimmed);
        });
        compressed = buildLines.join('\n');
      } 
      else if (detectedType === 'test') {
        let failedTests = [];
        let currentFailedTest = null;
        let summaryLines = [];
        let insideStackTrace = false;

        lines.forEach(line => {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('FAIL') || trimmed.includes('❌') || trimmed.includes('failed')) {
            if (currentFailedTest) {
              failedTests.push(currentFailedTest);
            }
            currentFailedTest = { file: trimmed, details: [] };
            insideStackTrace = true;
          } else if (trimmed.startsWith('PASS') || trimmed.includes('✓')) {
            insideStackTrace = false;
          } else if (insideStackTrace && currentFailedTest) {
            if (currentFailedTest.details.length < 20) {
              currentFailedTest.details.push(line);
            }
          }

          if (trimmed.startsWith('Test Suites:') || trimmed.startsWith('Tests:') || trimmed.startsWith('Snapshots:') || trimmed.startsWith('Time:')) {
            summaryLines.push(trimmed);
          }
        });

        if (currentFailedTest) {
          failedTests.push(currentFailedTest);
        }

        let outputParts = [];
        if (failedTests.length > 0) {
          outputParts.push(`--- FAILED TESTS (${failedTests.length}) ---`);
          failedTests.forEach(test => {
            outputParts.push(test.file);
            outputParts.push(test.details.join('\n'));
            outputParts.push('------------------------');
          });
        } else {
          outputParts.push('All tests passed! (or no failures detected)');
        }

        if (summaryLines.length > 0) {
          outputParts.push('\n--- TEST SUMMARY ---');
          outputParts.push(summaryLines.join('\n'));
        }

        compressed = outputParts.join('\n');
      } 
      else if (detectedType === 'linter') {
        let errors = [];
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.toLowerCase().includes('error') || trimmed.toLowerCase().includes('failed') || trimmed.includes('ts(') || trimmed.includes('✖')) {
            errors.push(trimmed);
          }
        });
        if (errors.length === 0) {
          compressed = lines.slice(0, 50).map(l => l.trim()).filter(Boolean).join('\n') + '\n(Linter warnings collapsed)';
        } else {
          compressed = errors.join('\n');
        }
      } 
      else {
        let collapsed = [];
        let lastLine = '';
        let duplicateCount = 0;

        lines.forEach(line => {
          let trimmed = line.trim();
          if (!trimmed) return;

          trimmed = trimmed.replace(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\s*/, '');
          trimmed = trimmed.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');

          if (trimmed === lastLine) {
            duplicateCount++;
          } else {
            if (duplicateCount > 0) {
              collapsed[collapsed.length - 1] = `${lastLine} (repeated ${duplicateCount + 1} times)`;
              duplicateCount = 0;
            }
            collapsed.push(trimmed);
            lastLine = trimmed;
          }
        });

        if (duplicateCount > 0) {
          collapsed[collapsed.length - 1] = `${lastLine} (repeated ${duplicateCount + 1} times)`;
        }

        if (collapsed.length > 200) {
          const start = collapsed.slice(0, 70);
          const end = collapsed.slice(-70);
          compressed = [...start, `\n... [${collapsed.length - 140} lines collapsed to save tokens] ...\n`, ...end].join('\n');
        } else {
          compressed = collapsed.join('\n');
        }
      }

      const charBefore = rawLogs.length;
      const charAfter = compressed.length;
      const tokensBefore = Math.round(charBefore / 4);
      const tokensAfter = Math.round(charAfter / 4);
      const savedPercent = Math.max(0, Math.round(((charBefore - charAfter) / charBefore) * 100));
      
      const costBefore = (tokensBefore / 1000000) * 3.0;
      const costAfter = (tokensAfter / 1000000) * 3.0;
      const costSaved = Math.max(0, costBefore - costAfter);

      setCompressedLogs(compressed);
      setStats({
        charBefore,
        charAfter,
        tokensBefore,
        tokensAfter,
        savedPercent,
        costSaved
      });
      setIsCompressing(false);
    }, 400);
  };

  const handleCopyLogs = () => {
    if (!compressedLogs) return;
    navigator.clipboard.writeText(compressedLogs);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  // Tab 3: URL Design Inspector logic
  const cleanAndTruncateHtml = (html) => {
    if (!html) return '';
    
    // 1. Extract head metadata (stylesheets, fonts, title)
    let headSnippet = '';
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (headMatch) {
      const headContent = headMatch[1];
      headSnippet = headContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
        .replace(/<link[^>]*rel="preload"[^>]*>/gi, '')
        .trim();
    }

    // 2. Extract style tags (CSS declarations)
    let styleSnippet = '';
    const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      styleSnippet = styleMatches.map(m => m.replace(/<style[^>]*>|<\/style>/gi, '')).join('\n');
      if (styleSnippet.length > 8000) {
        styleSnippet = styleSnippet.slice(0, 8000) + '\n... [Style rules truncated] ...';
      }
    }

    // 3. Extract body structure (strip scripts, SVG paths, and comments)
    let bodySnippet;
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      let bodyContent = bodyMatch[1];
      bodyContent = bodyContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '[SVG Icon]')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\s+/g, ' ');
        
      bodySnippet = bodyContent.slice(0, 15000);
      if (bodyContent.length > 15000) {
        bodySnippet += '\n... [HTML Body content truncated to save tokens] ...';
      }
    } else {
      let cleanRaw = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '[SVG]')
        .replace(/\s+/g, ' ')
        .trim();
      bodySnippet = cleanRaw.slice(0, 15000);
    }

    return `--- TITEL & LINK ASSET ---\n${headSnippet.slice(0, 3000)}\n\n--- CSS STYLES ---\n${styleSnippet}\n\n--- STRUKTUR BODY Halaman ---\n${bodySnippet}`;
  };

  const fetchHtmlWithFallbackProxies = async (url) => {
    // List of free public CORS proxies
    const proxies = [
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.codetabs.com/v1/proxy?quest=${u}`,
      (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`
    ];

    let lastError = null;

    for (let i = 0; i < proxies.length; i++) {
      const proxyUrl = proxies[i](url);
      try {
        console.log(`Trying proxy ${i + 1}: ${proxyUrl}`);
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}`);
        }
        
        if (proxyUrl.includes('allorigins.win')) {
          const json = await response.json();
          if (json && json.contents) {
            return json.contents;
          } else {
            throw new Error('Empty content from AllOrigins');
          }
        } else {
          const text = await response.text();
          if (text && text.trim().length > 100) {
            return text;
          } else {
            throw new Error('Empty or too short text response');
          }
        }
      } catch (err) {
        console.warn(`Proxy ${i + 1} failed:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('All CORS proxies failed to fetch the URL.');
  };

  const handleInspectWebsite = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setInspectorError('API Key belum diatur. Harap konfigurasi API Key di menu Pengaturan.');
      return;
    }

    if (!targetUrl.trim() && !manualHtml.trim()) {
      setInspectorError('Masukkan URL website atau tempel kode HTML terlebih dahulu.');
      return;
    }

    setIsInspecting(true);
    setInspectorError('');
    setInspectorResult('');
    setIsProxyFailed(false);

    let htmlContent;

    if (targetUrl.trim()) {
      let formattedUrl = targetUrl.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
        setTargetUrl(formattedUrl);
      }

      try {
        htmlContent = await fetchHtmlWithFallbackProxies(formattedUrl);
      } catch (err) {
        console.warn('All CORS Proxies failed, falling back to manual paste HTML:', err.message);
        setIsProxyFailed(true);
        setIsInspecting(false);
        setInspectorError('Gagal mengambil data dari URL secara otomatis (Terhalang CORS atau enkripsi Cloudflare). Silakan masukkan kode HTML-nya di panel "Tempel Kode HTML" di bawah.');
        return;
      }
    } else {
      htmlContent = manualHtml;
    }

    const cleanedHtml = cleanAndTruncateHtml(htmlContent);

    try {
      const prompt = `Kamu adalah Web Design & UX Inspector Pro. Tugasmu adalah menganalisis struktur dan visual dari situs web berdasarkan data scraping HTML/CSS berikut.

URL Situs: ${targetUrl || 'Input Manual HTML'}
HTML/CSS Metadata & Snippet:
${cleanedHtml}

Hasilkan Laporan Breakdown Desain Lengkap dalam format Markdown (.md) yang siap dikonsumsi oleh AI Coding Assistant (Cursor / Copilot / Claude Code / Kiro) untuk mereplikasi/mempelajari desain situs ini secara akurat.

Laporan HARUS mencakup:
1. **INFORMASI UMUM**: Judul halaman, deskripsi singkat, bahasa utama situs.
2. **SKEMA WARNA (PALETTE)**:
   - Warna Utama (Primary), Warna Sekunder (Secondary), Background (Latar Belakang), Aksen (Accent), serta Teks.
   - Sediakan kode HEX untuk setiap warna.
   - Sediakan token/custom properties CSS (misal: --color-primary: #xxxxxx) yang direkomendasikan.
3. **TIPOGRAFI & FONT**:
   - Jenis font yang digunakan (Font Family) untuk heading dan body.
   - Sizing skala (font size) dan weights (font weight) yang digunakan.
4. **ESTETIKA & GAYA DESAIN**:
   - Gaya desain (misal: Minimalis, Glassmorphism, Brutalisme, Web3 Modern, Retro, Corporate, dll.).
   - Border radius, efek shadow/bayangan, ketebalan border, dan spacing (padding/margin) yang mencolok.
5. **STRUKTUR TATA LETAK (LAYOUT ARCHITECTURE)**:
   - Struktur grid/flexbox yang terdeteksi (misal: navbar atas, sidebar kiri, main grid 3-kolom, footer).
   - Ukuran kontainer lebar (misal: max-width 1200px, full-width).
   - Responsivitas (bagaimana tata letak berubah pada mobile).
6. **DAFTAR KOMPONEN UTAMA (UI COMPONENTS)**:
   - Breakdown komponen penting (misal: tombol CTA, kartu info, kolom input, hero banner, accordion) beserta detail styling-nya.
7. **PANDUAN VIBE CODING PROMPT**:
   - Buat satu System Prompt / Developer Instruction khusus yang bisa langsung di-copy oleh user untuk dimasukkan ke AI Coding Assistant agar AI bisa membangun replika website dengan struktur, warna, font, dan nuansa yang identik.

Tulis laporan ini secara profesional dalam Bahasa Indonesia (kecuali kode teknis CSS/HTML) dan gunakan format Markdown murni yang sangat bersih. Jangan sertakan teks pembuka atau penutup lain di luar Markdown tersebut.`;

      const responseText = await generateContent(apiKey, prompt, aiProvider, aiModel);
      setInspectorResult(responseText);

      // Log to history
      addHistory({
        type: 'vibe-assets',
        category: 'URL Inspector',
        title: `Breakdown Desain ${targetUrl || 'HTML Tempel'}`,
        content: responseText.slice(0, 500) + '...',
        meta: { targetUrl: targetUrl || 'manual-html' }
      });
    } catch (err) {
      setInspectorError(err.message || 'Gagal menganalisis desain website.');
    } finally {
      setIsInspecting(false);
    }
  };

  const mockup = getMockupStyles();
  const activeGuidelineText = activeSubTab === 'design' ? designMd : activeSubTab === 'style' ? styleMd : promptMd;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ marginBottom: '0.5rem', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Code size={32} /> Vibe Coding Hub
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Alat pendukung Vibe Coding: rancang guidelines desain visual, analisis web inspirator, dan pangkas token log Anda.
        </p>
      </div>

      {/* Main Tab Switcher */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        background: 'var(--bg-main)', 
        padding: '0.35rem', 
        borderRadius: '10px', 
        border: '1px solid var(--border-color)', 
        marginBottom: '2rem',
        width: '100%',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none'
      }}>
        <button
          onClick={() => setActiveTab('pedoman')}
          className="btn"
          style={{
            background: activeTab === 'pedoman' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'pedoman' ? 'var(--primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'pedoman' ? 'var(--shadow-sm)' : 'none',
            borderRadius: '8px',
            padding: '0.6rem 1.25rem',
            flexShrink: 0
          }}
        >
          <Paintbrush size={16} /> Pedoman Proyek (design.md & style.md)
        </button>
        <button
          onClick={() => setActiveTab('inspector')}
          className="btn"
          style={{
            background: activeTab === 'inspector' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'inspector' ? 'var(--primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'inspector' ? 'var(--shadow-sm)' : 'none',
            borderRadius: '8px',
            padding: '0.6rem 1.25rem',
            flexShrink: 0
          }}
        >
          <Code size={16} /> Inspector Desain Web
        </button>
        <button
          onClick={() => setActiveTab('token-killer')}
          className="btn"
          style={{
            background: activeTab === 'token-killer' ? 'var(--bg-card)' : 'transparent',
            color: activeTab === 'token-killer' ? 'var(--primary)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'token-killer' ? 'var(--shadow-sm)' : 'none',
            borderRadius: '8px',
            padding: '0.6rem 1.25rem',
            flexShrink: 0
          }}
        >
          <Terminal size={16} /> Token Killer (Log Compressor)
        </button>
      </div>

      {/* ===================== TAB 1: PEDOMAN PROYEK ===================== */}
      {activeTab === 'pedoman' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="var(--primary)" /> Konfigurasi Tema & Desain
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Nama / Tema Proyek</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)} 
                    placeholder="Contoh: Toko Kopi Online"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Estetika Visual</label>
                    <select 
                      className="input-field" 
                      value={aesthetic} 
                      onChange={(e) => setAesthetic(e.target.value)}
                    >
                      <option value="glassmorphism">Glassmorphism Dark</option>
                      <option value="neobrutalism">Neobrutalism Vibrant</option>
                      <option value="minimalist">Minimalist Clean</option>
                      <option value="cyberpunk">Retro Cyberpunk</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Referensi Design System (ihlamury)</label>
                    <select 
                      className="input-field" 
                      value={designSystem} 
                      onChange={(e) => setDesignSystem(e.target.value)}
                    >
                      <option value="none">Tanpa Referensi Khusus (Bawaan)</option>
                      <option value="stripe">Stripe (Fintech, Modern Light)</option>
                      <option value="linear">Linear (Premium Dark, 4px grid)</option>
                      <option value="vercel">Vercel (Minimal Monochrome)</option>
                      <option value="apple">Apple (Cupertino Premium, Light)</option>
                      <option value="supabase">Supabase (Sleek DB Mode, Green Accents)</option>
                      <option value="figma">Figma (Collaborative UI, Dark)</option>
                      <option value="obsidian">Obsidian (Markdown Graph, Dark)</option>
                      <option value="things">Things (Cupertino Todo, Light)</option>
                      <option value="discord">Discord (Signature Blurple, Dark)</option>
                      <option value="slack">Slack (Enterprise Collaboration)</option>
                      <option value="raycast">Raycast (macOS Launcher Glassmorphism)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Warna Utama (Primary)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      style={{ width: '42px', height: '42px', padding: '0', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input 
                      type="text" 
                      className="input-field" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem', padding: '0.5rem', flex: 1 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Catatan Khusus / Requirements Tambahan (Opsional)</label>
                  <textarea 
                    className="input-field" 
                    rows={3} 
                    value={specialNotes} 
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="Contoh: Gunakan Outfit font, responsive, support Dark Mode, navigasi transparan..."
                  />
                </div>

                {/* API Key warning if missing */}
                {!getApiKey() && (
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    background: '#fffbeb', 
                    border: '1px solid #f59e0b', 
                    color: '#b45309',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      Gemini/Groq/OpenAI API Key belum diatur. Silakan atur di <Link to="/settings" style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#b45309' }}>Pengaturan</Link> terlebih dahulu untuk menggunakan generator AI.
                    </div>
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  onClick={handleGenerateGuidelines} 
                  disabled={isGenerating || !getApiKey()}
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 600 }}
                >
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                  {isGenerating ? 'Menyusun Pedoman Desain...' : 'Hasilkan Pedoman Vibe Coding (AI)'}
                </button>

                {pedomanError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    ❌ {pedomanError}
                  </div>
                )}
              </div>
            </div>

            {/* Generated Output Card */}
            {(designMd || styleMd || promptMd || isGenerating) && (
              <div className="card" style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                {isGenerating && !designMd ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>AI sedang menulis dokumen design.md, style.md, dan prompt.md...</p>
                  </div>
                ) : (
                  <div>
                    {/* Sub-tab selection */}
                    <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', overflowX: 'auto', width: '100%', whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                      <button 
                        onClick={() => setActiveSubTab('design')}
                        className="btn"
                        style={{
                          background: activeSubTab === 'design' ? 'var(--primary-light)' : 'transparent',
                          color: activeSubTab === 'design' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '6px', flexShrink: 0
                        }}
                      >
                        <FileText size={14} /> design.md
                      </button>
                      <button 
                        onClick={() => setActiveSubTab('style')}
                        className="btn"
                        style={{
                          background: activeSubTab === 'style' ? 'var(--primary-light)' : 'transparent',
                          color: activeSubTab === 'style' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '6px', flexShrink: 0
                        }}
                      >
                        <Code size={14} /> style.md
                      </button>
                      <button 
                        onClick={() => setActiveSubTab('prompt')}
                        className="btn"
                        style={{
                          background: activeSubTab === 'prompt' ? 'var(--primary-light)' : 'transparent',
                          color: activeSubTab === 'prompt' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '6px', flexShrink: 0
                        }}
                      >
                        <Terminal size={14} /> prompt.md
                      </button>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Tipe: {activeSubTab === 'design' ? 'design.md (Arsitektur)' : activeSubTab === 'style' ? 'style.md (CSS Utility)' : 'prompt.md (Prompt System)'}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => handleCopyPedoman(activeGuidelineText)}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          {copiedText ? <CheckCircle2 size={14} color="var(--success)" /> : <Clipboard size={14} />}
                          {copiedText ? 'Tersalin' : 'Salin'}
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => handleDownloadPedoman(`${activeSubTab}.md`, activeGuidelineText)}
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          <Download size={14} /> Unduh
                        </button>
                      </div>
                    </div>

                    {/* Text Display */}
                    <textarea
                      readOnly
                      className="input-field"
                      value={activeGuidelineText}
                      rows={12}
                      style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.85rem', 
                        lineHeight: 1.5,
                        backgroundColor: '#0f172a',
                        color: '#f8fafc',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Preview & Documentation Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Real-time Preview */}
            <div className="card" style={{ borderTop: '4px solid var(--accent)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Paintbrush size={18} color="var(--accent)" /> Real-Time Mockup Preview
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Perubahan estetika dan warna primary akan memodifikasi mockup visual di bawah ini secara instan.
              </p>

              {/* Preview Box */}
              <div style={mockup.container}>
                <div style={mockup.card}>
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  </div>
                  
                  <span style={mockup.title}>{theme || 'Nama Proyek'}</span>
                  <span style={mockup.subtitle}>
                    Estetika: {aesthetic.toUpperCase()} 
                    {designSystem !== 'none' && ` | Ref: ${designSystem.toUpperCase()}`}
                  </span>
                  
                  <div style={mockup.stat}>
                    {aesthetic === 'cyberpunk' ? (
                      <div>STATUS: ONLINE // TARGET: COMPLETED</div>
                    ) : aesthetic === 'neobrutalism' ? (
                      <div>SKOR KINERJA: 98% AKURAT</div>
                    ) : (
                      <span>⚙️ Integrasi Sistem Aktif</span>
                    )}
                  </div>
                  
                  <button style={mockup.button} onClick={() => alert('Mockup Interaktif!')}>
                    Mulai Proyek
                  </button>
                </div>
              </div>
            </div>

            {/* Instruction Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>Cara Vibe Coding dengan File Ini:</h4>
              <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li>Hasilkan dokumen dan salin isi dari `design.md` dan `style.md` ke folder proyek Anda.</li>
                <li>Salin isi `prompt.md` dan gunakan sebagai System Instruction (atau tempel di file `.cursorrules` / `.claudeprompt` / AI Chat panel).</li>
                <li>AI Assistant Anda akan secara akurat mengikuti aturan coding, format component, dan styling visual tersebut tanpa melenceng.</li>
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* ===================== TAB 2: URL INSPECTOR ===================== */}
      {activeTab === 'inspector' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ borderTop: '4px solid var(--accent)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Code size={18} color="var(--accent)" /> Inspector Desain Web (URL Analyzer)
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Masukkan tautan (link) website apa saja di bawah ini. AI akan menganalisis strukturnya, mengekstrak skema warna, font, layout, estetika, bahasa, dan menulis dokumen panduan Markdown (.md) yang siap di-copy paste ke AI Vibe Coding Anda.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  value={targetUrl} 
                  onChange={(e) => setTargetUrl(e.target.value)} 
                  placeholder="Contoh: https://example.com"
                  style={{ margin: 0 }}
                  disabled={isInspecting}
                />
                
                <button
                  className="btn btn-primary"
                  onClick={handleInspectWebsite}
                  disabled={isInspecting || (!targetUrl.trim() && !manualHtml.trim())}
                  style={{ whiteSpace: 'nowrap', padding: '0.85rem 1.5rem', margin: 0, height: '48px' }}
                >
                  {isInspecting ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                  {isInspecting ? 'Menganalisis...' : 'Analisis Desain'}
                </button>
              </div>

              {/* API Key warning if missing */}
              {!getApiKey() && (
                <div style={{ 
                  padding: '0.75rem 1rem', 
                  borderRadius: '8px', 
                  background: '#fffbeb', 
                  border: '1px solid #f59e0b', 
                  color: '#b45309',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}>
                  <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    API Key belum diatur. Silakan atur di <Link to="/settings" style={{ fontWeight: 'bold', textDecoration: 'underline', color: '#b45309' }}>Pengaturan</Link> terlebih dahulu untuk melakukan analisis AI.
                  </div>
                </div>
              )}

              {/* Proxy failure fallback / Manual HTML upload */}
              {(isProxyFailed || !targetUrl.trim()) && (
                <div style={{ 
                  animation: 'slideUpFade 0.25s ease-out forwards',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: 'var(--bg-main)',
                  border: '1px dashed var(--border-color)',
                  marginTop: '0.5rem'
                }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    Cadangan: Tempel Kode HTML Halaman (View Source / Inspect)
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Jika situs memblokir pembacaan otomatis atau CORS error, klik kanan di web target → pilih **View Page Source**, salin semua kodenya (Ctrl+A / Cmd+A) lalu tempel di bawah.
                  </p>
                  <textarea
                    className="input-field"
                    rows={6}
                    value={manualHtml}
                    onChange={(e) => setManualHtml(e.target.value)}
                    placeholder="<html><head>... tempel kode HTML halaman web target di sini ..."
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    disabled={isInspecting}
                  />
                </div>
              )}

              {inspectorError && (
                <div style={{ 
                  color: '#dc2626', 
                  fontSize: '0.85rem', 
                  background: '#fef2f2', 
                  border: '1px solid #fca5a5', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '8px',
                  marginTop: '0.5rem'
                }}>
                  ❌ {inspectorError}
                </div>
              )}
            </div>
          </div>

          {/* Results Block */}
          {(inspectorResult || isInspecting) && (
            <div className="card" style={{ borderTop: '4px solid var(--success)', background: 'var(--bg-card)' }}>
              {isInspecting && !inspectorResult ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                  <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1.25rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Sedang mengunduh halaman dan mengekstrak aset desain...
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    AI sedang menyusun laporan markdown detail untuk vibe coding.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Sparkles size={18} color="var(--success)" /> Hasil Breakdown Desain (Markdown)
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleCopyPedoman(inspectorResult)}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        {copiedText ? <CheckCircle2 size={14} color="var(--success)" /> : <Clipboard size={14} />}
                        {copiedText ? 'Tersalin' : 'Salin Laporan'}
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => handleDownloadPedoman('design_breakdown.md', inspectorResult)}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        <Download size={14} /> Unduh (.md)
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    💡 Sempurna untuk Vibe Coding! Copy laporan di bawah ini dan paste langsung ke Cursor / Copilot / Claude Code chat panel Anda.
                  </p>

                  <textarea
                    readOnly
                    className="input-field"
                    value={inspectorResult}
                    rows={18}
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.85rem', 
                      lineHeight: 1.6,
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '1.25rem'
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: TOKEN KILLER ===================== */}
      {activeTab === 'token-killer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ borderTop: '4px solid var(--danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={18} color="var(--danger)" /> Token Killer — Log Compressor
              </h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipe Log:</label>
                <select 
                  className="input-field" 
                  value={logType} 
                  onChange={(e) => setLogType(e.target.value)}
                  style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <option value="auto">Auto-Detect</option>
                  <option value="git">Git Status</option>
                  <option value="vite">Vite Build</option>
                  <option value="test">Unit Test (Vitest/Jest)</option>
                  <option value="linter">Linter (ESLint/TS Compiler)</option>
                  <option value="general">General (Collapse Duplicate & Lines)</option>
                </select>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Kurangi konsumsi token input AI Anda hingga 60-90% dengan membuang visual bloat, modul loading transform, test passed yang tidak penting, dan file warning duplikat dari log terminal.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Raw Input Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Log Mentah (Raw Terminal Output)</label>
                <textarea
                  className="input-field"
                  rows={12}
                  value={rawLogs}
                  onChange={(e) => setRawLogs(e.target.value)}
                  placeholder="Tempel output terminal di sini... (misal: npm run build, git status, npm test, dll)"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.4 }}
                />
              </div>

              {/* Compressed Output Area */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Log Ringkas (Compressed Logs)</label>
                  {compressedLogs && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={handleCopyLogs}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      {copiedLogs ? <CheckCircle2 size={12} color="var(--success)" /> : <Clipboard size={12} />}
                      {copiedLogs ? 'Tersalin' : 'Salin Hasil'}
                    </button>
                  )}
                </div>
                <textarea
                  readOnly
                  className="input-field"
                  rows={12}
                  value={compressedLogs}
                  placeholder="Hasil kompresi log akan muncul di sini..."
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.8rem', 
                    lineHeight: 1.4,
                    backgroundColor: '#0f172a',
                    color: '#e2e8f0'
                  }}
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleCompressLogs}
              disabled={isCompressing || !rawLogs.trim()}
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem', fontWeight: 600 }}
            >
              {isCompressing ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
              {isCompressing ? 'Mengompresi Log...' : 'Bunuh Token (Kompresi Log)'}
            </button>
          </div>

          {/* Analytics Savings Widget */}
          {stats && (
            <div className="card" style={{ 
              borderLeft: '5px solid var(--success)', 
              background: '#ecfdf5',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
              alignItems: 'center',
              animation: 'slideUpFade 0.3s ease-out forwards'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Tingkat Penghematan</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Zap size={22} fill="var(--warning)" color="var(--warning)" /> {stats.savedPercent}%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Karakter Log</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#065f46' }}>
                  {stats.charBefore.toLocaleString()} → {stats.charAfter.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Estimasi Token LLM</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#065f46' }}>
                  ~{stats.tokensBefore.toLocaleString()} → ~{stats.tokensAfter.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Penghematan Biaya</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#065f46' }}>
                  ${stats.costSaved.toFixed(5)} USD / prompt
                </span>
                <span style={{ fontSize: '0.65rem', color: '#047857' }}>*Skala Claude 3.5 Sonnet Input</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
