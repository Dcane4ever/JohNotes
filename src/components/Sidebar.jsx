import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, BookMarked, Calendar, FileText, Search, Sun, Moon, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', icon: BookOpen, label: 'Notebook' },
  { to: '/books', icon: BookMarked, label: 'Books' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/rrl', icon: FileText, label: 'RRL' },
]

export default function Sidebar({ theme, onToggleTheme }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()

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

  const isDark = theme === 'dark'
  const bg = isDark ? '#16161e' : '#f8f8fc'
  const border = isDark ? '#2a2a35' : '#e2e2e7'
  const text = isDark ? '#9ca3af' : '#6b7280'
  const activeText = isDark ? '#c084fc' : '#7c3aed'
  const activeBg = isDark ? 'rgba(192,132,252,0.1)' : 'rgba(124,58,237,0.08)'

  const TYPE_ICONS = { note: '📓', book: '📚', rrl: '📄' }
  const TYPE_LABELS = { note: 'Note', book: 'Book', rrl: 'RRL' }

  return (
    <aside style={{
      width: '220px', minHeight: '100vh', background: bg,
      borderRight: `1px solid ${border}`, display: 'flex',
      flexDirection: 'column', padding: '20px 12px', gap: '4px',
      flexShrink: 0, position: 'relative',
    }}>
      {/* Logo + theme toggle */}
      <div style={{ padding: '0 12px 16px', borderBottom: `1px solid ${border}`, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '20px', fontWeight: '700', color: '#c084fc', letterSpacing: '-0.5px' }}>Amenō</span>
        <button onClick={onToggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', color: text, display: 'flex', padding: '4px' }}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      {/* Global search */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: text }} />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search everything..."
          style={{
            width: '100%', boxSizing: 'border-box', background: isDark ? '#12121a' : '#ededf5',
            border: `1px solid ${border}`, borderRadius: '7px', padding: '7px 28px 7px 28px',
            color: isDark ? '#e2e2e7' : '#1a1a2e', fontSize: '12px', outline: 'none',
          }}
        />
        {search && (
          <button onClick={() => { setSearch(''); setResults([]) }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: text, display: 'flex', padding: 0 }}>
            <X size={12} />
          </button>
        )}

        {/* Search results dropdown */}
        {search && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: isDark ? '#16161e' : '#fff', border: `1px solid ${border}`,
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
                onMouseEnter={e => e.currentTarget.style.background = isDark ? '#1e1e2a' : '#f0f0f8'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '14px' }}>{TYPE_ICONS[r.type]}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: isDark ? '#e2e2e7' : '#1a1a2e', margin: 0 }}>{r.label}</p>
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
