import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Notebook from './pages/Notebook'
import Books from './pages/Books'
import Schedule from './pages/Schedule'
import RRL from './pages/RRL'
import Settings from './pages/Settings'
import { THEMES, applyTheme } from './lib/themes'
import { Menu, X } from 'lucide-react'

function AppInner({ themeKey, setThemeKey, theme }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const location = useLocation()

  useEffect(() => {
    function handleResize() { setIsMobile(window.innerWidth <= 768) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close drawer on route change
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', position: 'relative', flex: 1, minWidth: 0 }}>

      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(p => !p)}
          style={{
            position: 'fixed', top: '12px', left: '12px', zIndex: 300,
            background: theme.surface2, border: `1px solid ${theme.border}`,
            borderRadius: '8px', padding: '7px', cursor: 'pointer',
            color: theme.textMuted, display: 'flex', alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {/* Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 200, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: 0, height: '100vh', zIndex: 250,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: isMobile ? 'transform 0.25s ease' : 'none',
        flexShrink: 0,
      }}>
        <Sidebar themeKey={themeKey} theme={theme} onThemeChange={setThemeKey} />
      </div>

      {/* Main */}
      <main style={{
        flex: 1, overflow: 'auto', background: 'var(--bg)',
        paddingTop: isMobile ? '52px' : 0,
      }}>
        <Routes>
          <Route path="/" element={<Notebook theme={theme} />} />
          <Route path="/books" element={<Books theme={theme} />} />
          <Route path="/schedule" element={<Schedule theme={theme} />} />
          <Route path="/rrl" element={<RRL theme={theme} />} />
          <Route path="/settings" element={<Settings theme={theme} />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('ameno-theme') || 'dark-purple')

  useEffect(() => {
    const t = THEMES[themeKey] || THEMES['dark-purple']
    applyTheme(t)
    localStorage.setItem('ameno-theme', themeKey)
  }, [themeKey])

  const theme = THEMES[themeKey] || THEMES['dark-purple']

  return (
    <BrowserRouter basename="/JohNotes">
      <AppInner themeKey={themeKey} setThemeKey={setThemeKey} theme={theme} />
    </BrowserRouter>
  )
}
