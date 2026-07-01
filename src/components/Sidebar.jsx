import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, BookMarked, Calendar, FileText, Search, X, Palette } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { THEMES } from '../lib/themes'
import fanLogo from '../assets/Fan.png'

const links = [
  { to: '/', icon: BookOpen, label: 'Notebook' },
  { to: '/books', icon: BookMarked, label: 'Books' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/rrl', icon: FileText, label: 'RRL' },
]

export default function Sidebar({ themeKey, theme, onThemeChange }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const navigate = useNavigate()

  const bg = theme.surface2
  const border = theme.border
  const text = theme.textMuted
  const activeText = theme.accent
  const activeBg = theme.accentBg

  async function handleSearch(val) {
    setSearch(val)
    if (!val.trim()) { setResults([]); return }
    setSearching(true)
    const q = val.toLowerCase()
    const [{ data: notes }, { data: books }, { data: rrl }] = await Promise.all([
      supabase.from('notes').select('id, title, subject_id').ilike('title', `%${q}%`).limit(4),
      supabase.from('books').select('id, title, author').ilike('title', `%${q}%`).limit(4),
      supabase.from('rrl_entries').select('id, title').ilike('title', `%${q}%`).limit(4),
    ])
    const combined = [
      ...(notes || []).map(n => ({ ...n, type: 'note', label: n.title || 'Untitled', path: '/' })),
      ...(books || []).map(b => ({ ...b, type: 'book', label: b.title, path: '/books' })),
      ...(rrl || []).map(r => ({ ...r, type: 'rrl', label: r.title, path: '/rrl' })),
    ]
    setResults(combined)
    setSearching(false)
  }

  function goTo(path) {
    navigate(path)
    setSearch('')
    setResults([])
  }

  const TYPE_ICONS = { note: '📓', book: '📚', rrl: '📄' }
  const TYPE_LABELS = { note: 'Note', book: 'Book', rrl: 'RRL' }

  return (
    <aside style={{
      width: '220px', minHeight: '100vh', background: bg,
      borderRight: `1px solid ${border}`, display: 'flex',
      flexDirection: 'column', padding: '20px 12px', gap: '4px',
      flexShrink: 0, position: 'relative',
    }}>
      {/* Logo + theme button */}
      <div style={{ padding: '0 8px 16px', borderBottom: `1px solid ${border}`, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={fanLogo}
            alt="Amenō"
            style={{ width: '42px', height: '42px', objectFit: 'contain', objectPosition: 'center top' }}
          />
          <span style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: '22px', fontWeight: '300', letterSpacing: '0.12em',
            color: theme.text, fontStyle: 'italic',
          }}>Amenō</span>
        </div>
        <button onClick={() => setShowThemePicker(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: text, display: 'flex', padding: '4px' }} title="Change theme">
          <Palette size={14} />
        </button>
      </div>

      {/* Theme picker */}
      {showThemePicker && (
        <div style={{
          position: 'absolute', top: '60px', left: '12px', right: '12px',
          background: theme.surface1, border: `1px solid ${border}`, borderRadius: '10px',
          padding: '12px', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: text, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Theme</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => { onThemeChange(key); setShowThemePicker(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '8px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                  background: themeKey === key ? theme.accentBg : 'transparent',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '16px' }}>{t.emoji}</span>
                <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                  {[t.bg, t.accent, t.surface2, t.text].map((c, i) => (
                    <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                  ))}
                </div>
                <span style={{ fontSize: '12px', fontWeight: themeKey === key ? '600' : '400', color: themeKey === key ? theme.accent : text }}>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Global search */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: text }} />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search everything..."
          style={{
            width: '100%', boxSizing: 'border-box', background: theme.surface1,
            border: `1px solid ${border}`, borderRadius: '7px', padding: '7px 28px',
            color: theme.text, fontSize: '12px', outline: 'none',
          }}
        />
        {search && (
          <button onClick={() => { setSearch(''); setResults([]) }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: text, display: 'flex', padding: 0 }}>
            <X size={12} />
          </button>
        )}
        {search && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: theme.surface2, border: `1px solid ${border}`,
            borderRadius: '8px', zIndex: 100, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}>
            {searching && <p style={{ padding: '10px 12px', fontSize: '12px', color: text }}>Searching...</p>}
            {!searching && results.length === 0 && <p style={{ padding: '10px 12px', fontSize: '12px', color: text }}>No results</p>}
            {results.map(r => (
              <div key={`${r.type}-${r.id}`} onClick={() => goTo(r.path)} style={{
                padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                borderBottom: `1px solid ${border}`,
              }}
                onMouseEnter={e => e.currentTarget.style.background = theme.surface3}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '14px' }}>{TYPE_ICONS[r.type]}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: theme.text, margin: 0 }}>{r.label}</p>
                  <p style={{ fontSize: '10px', color: text, margin: 0 }}>{TYPE_LABELS[r.type]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nav links */}
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '8px', textDecoration: 'none',
            fontSize: '14px', fontWeight: '500',
            color: isActive ? activeText : text,
            background: isActive ? activeBg : 'transparent',
            transition: 'all 0.15s',
          })}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
