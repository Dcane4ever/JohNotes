import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Search, ExternalLink, GitCompare, FileText, ChevronDown, ChevronUp, BookOpen, LayoutGrid, List, AlignLeft } from 'lucide-react'

export default function RRL({ theme = {} }) {
  const t = theme
  const [entries, setEntries] = useState([])
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('all')
  const [view, setView] = useState('list') // 'list' | 'grid' | 'detail'
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelected, setCompareSelected] = useState([])
  const [addToNotebook, setAddToNotebook] = useState(null)

  useEffect(() => { fetchEntries() }, [])

  async function fetchEntries() {
    const { data } = await supabase.from('rrl_entries').select('*').order('created_at', { ascending: false })
    if (data) setEntries(data)
  }

  const allTags = ['all', ...new Set(entries.flatMap(e => e.tags || []))]

  const filtered = entries.filter(e => {
    const matchSearch = !search || [e.title, e.authors?.join(' '), e.abstract].some(f => f?.toLowerCase().includes(search.toLowerCase()))
    const matchTag = activeTag === 'all' || (e.tags || []).includes(activeTag)
    return matchSearch && matchTag
  })

  function onSaved(entry, isNew) {
    if (isNew) setEntries(prev => [entry, ...prev])
    else setEntries(prev => prev.map(e => e.id === entry.id ? entry : e))
    setShowModal(false)
  }

  async function deleteEntry(id) {
    await supabase.from('rrl_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
    setShowModal(false)
  }

  function toggleCompare(entry) {
    setCompareSelected(prev => {
      if (prev.find(e => e.id === entry.id)) return prev.filter(e => e.id !== entry.id)
      if (prev.length >= 3) return prev
      return [...prev, entry]
    })
  }

  const primaryBtn = { display: 'flex', alignItems: 'center', gap: '6px', background: t.accentBtn, border: 'none', borderRadius: '8px', padding: '8px 16px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }
  const ghostBtn = { background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.textMuted, fontSize: '13px', cursor: 'pointer' }
  const inputStyle = { width: '100%', background: t.surface1, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '8px 10px', color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const tagPill = { fontSize: '11px', color: t.accent, background: t.accentBg, padding: '2px 8px', borderRadius: '20px', border: `1px solid ${t.border}` }

  const VIEW_BTNS = [
    { key: 'list', icon: List, title: 'List' },
    { key: 'grid', icon: LayoutGrid, title: 'Grid' },
    { key: 'detail', icon: AlignLeft, title: 'Detail' },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: '8px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: t.text }}>RRL Compiler</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: t.surface3, borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {VIEW_BTNS.map(({ key, icon: Icon, title }) => (
              <button key={key} title={title} onClick={() => setView(key)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '30px', height: '30px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: view === key ? t.accentBtn : 'transparent',
                color: view === key ? 'white' : t.textMuted,
              }}>
                <Icon size={14} />
              </button>
            ))}
          </div>
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareSelected([]) }}
            style={{ ...(compareMode ? primaryBtn : ghostBtn), display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <GitCompare size={14} /> {compareMode ? 'Exit' : 'Compare'}
          </button>
          <button onClick={() => { setEditEntry(null); setShowModal(true) }} style={primaryBtn}>
            <Plus size={15} /> Add Entry
          </button>
        </div>
      </div>

      {/* Search + tags */}
      <div style={{ padding: '16px 28px 0', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, author, abstract..."
            style={{ ...inputStyle, paddingLeft: '32px' }}
          />
        </div>
        {allTags.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setActiveTag(tag)} style={{
                padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '500',
                background: activeTag === tag ? t.accentBtn : t.surface3,
                color: activeTag === tag ? 'white' : t.textMuted,
              }}>
                {tag === 'all' ? 'All' : `#${tag}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compare mode banner */}
      {compareMode && (
        <div style={{ margin: '12px 28px 0', padding: '10px 14px', background: t.accentBg, border: `1px solid ${t.accent}40`, borderRadius: '8px', fontSize: '13px', color: t.accent }}>
          Select 2–3 entries to compare. Selected: {compareSelected.length}/3
          {compareSelected.length >= 2 && (
            <button onClick={() => setCompareMode('view')} style={{ marginLeft: '12px', background: t.accentBtn, border: 'none', borderRadius: '6px', padding: '4px 12px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>
              Compare now →
            </button>
          )}
        </div>
      )}

      {/* Compare view */}
      {compareMode === 'view' && compareSelected.length >= 2 ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compareSelected.length}, 1fr)`, gap: '16px' }}>
            {compareSelected.map(entry => (
              <div key={entry.id} style={{ background: t.surface1, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: t.text, marginBottom: '6px' }}>{entry.title}</h3>
                <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '8px' }}>{entry.authors?.join(', ')} {entry.year ? `(${entry.year})` : ''}</p>
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '10px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: t.textFaint, textTransform: 'uppercase', marginBottom: '6px' }}>Abstract</p>
                  <p style={{ fontSize: '13px', color: t.textMuted, lineHeight: '1.6' }}>{entry.abstract || 'No abstract.'}</p>
                </div>
                {entry.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {entry.tags.map(tag => <span key={tag} style={tagPill}>#{tag}</span>)}
                  </div>
                )}
                {entry.source_url && (
                  <a href={entry.source_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px', fontSize: '12px', color: t.accent, textDecoration: 'none' }}>
                    <ExternalLink size={12} /> View source
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Entry views */
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', gap: '12px', color: t.textFaint }}>
              <FileText size={40} />
              <p style={{ fontSize: '14px' }}>No entries yet. Add your first reference!</p>
            </div>
          ) : view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
              {filtered.map(entry => (
                <GridCard key={entry.id} entry={entry} theme={t} tagPill={tagPill}
                  compareMode={compareMode === true} selected={compareSelected.some(e => e.id === entry.id)}
                  onToggleCompare={() => toggleCompare(entry)} onEdit={() => { setEditEntry(entry); setShowModal(true) }}
                />
              ))}
            </div>
          ) : view === 'detail' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filtered.map(entry => (
                <DetailCard key={entry.id} entry={entry} theme={t} tagPill={tagPill}
                  compareMode={compareMode === true} selected={compareSelected.some(e => e.id === entry.id)}
                  onToggleCompare={() => toggleCompare(entry)} onEdit={() => { setEditEntry(entry); setShowModal(true) }}
                  onAddToNotebook={() => setAddToNotebook(entry)}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map(entry => (
                <EntryCard key={entry.id} entry={entry} theme={t} tagPill={tagPill}
                  compareMode={compareMode === true} selected={compareSelected.some(e => e.id === entry.id)}
                  onToggleCompare={() => toggleCompare(entry)} onEdit={() => { setEditEntry(entry); setShowModal(true) }}
                  onAddToNotebook={() => setAddToNotebook(entry)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <EntryModal entry={editEntry} theme={t} onClose={() => setShowModal(false)} onSaved={onSaved} onDelete={deleteEntry} />
      )}

      {addToNotebook && (
        <AddToNotebookModal entry={addToNotebook} theme={t} onClose={() => setAddToNotebook(null)} />
      )}
    </div>
  )
}

/* ── List card (original) ───────────────────────────────── */
function EntryCard({ entry, theme: t, tagPill, compareMode, selected, onToggleCompare, onEdit, onAddToNotebook }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ background: t.surface1, border: `1px solid ${selected ? t.accent : t.border}`, borderRadius: '10px', padding: '16px', cursor: 'pointer', outline: selected ? `1px solid ${t.accent}` : 'none' }}
      onClick={compareMode ? onToggleCompare : onEdit}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: t.text, margin: 0 }}>{entry.title}</h3>
            {entry.year && <span style={{ fontSize: '11px', color: t.textMuted, background: t.surface3, padding: '1px 6px', borderRadius: '4px' }}>{entry.year}</span>}
          </div>
          {entry.authors?.length > 0 && <p style={{ fontSize: '12px', color: t.textMuted, margin: '4px 0 0' }}>{entry.authors.join(', ')}</p>}
          {entry.abstract && (
            <p style={{ fontSize: '13px', color: t.textMuted, margin: '8px 0 0', lineHeight: '1.5', display: expanded ? 'block' : '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden' }}>
              {entry.abstract}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
          <button onClick={e => { e.stopPropagation(); onAddToNotebook() }} title="Add to Notebook" style={{ background: 'none', border: 'none', color: t.accent, cursor: 'pointer', display: 'flex', padding: '2px' }}>
            <BookOpen size={14} />
          </button>
          {entry.source_url && (
            <a href={entry.source_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: t.accent, display: 'flex' }}>
              <ExternalLink size={14} />
            </a>
          )}
          {entry.abstract && (
            <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', display: 'flex', padding: 0 }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>
      {entry.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
          {entry.tags.map(tag => <span key={tag} style={tagPill}>#{tag}</span>)}
        </div>
      )}
    </div>
  )
}

/* ── Grid card ──────────────────────────────────────────── */
function GridCard({ entry, theme: t, tagPill, compareMode, selected, onToggleCompare, onEdit }) {
  return (
    <div onClick={compareMode ? onToggleCompare : onEdit} style={{
      background: t.surface1, border: `1px solid ${selected ? t.accent : t.border}`,
      borderRadius: '10px', padding: '14px', cursor: 'pointer',
      outline: selected ? `1px solid ${t.accent}` : 'none',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: t.text, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{entry.title}</h3>
          {entry.year && <span style={{ fontSize: '10px', color: t.textMuted, background: t.surface3, padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>{entry.year}</span>}
        </div>
        {entry.authors?.length > 0 && (
          <p style={{ fontSize: '11px', color: t.textMuted, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.authors.join(', ')}</p>
        )}
      </div>
      {entry.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {entry.tags.slice(0, 3).map(tag => <span key={tag} style={{ ...tagPill, fontSize: '10px', padding: '1px 6px' }}>#{tag}</span>)}
          {entry.tags.length > 3 && <span style={{ fontSize: '10px', color: t.textFaint }}>+{entry.tags.length - 3}</span>}
        </div>
      )}
      {entry.source_url && (
        <a href={entry.source_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: '11px', color: t.accent, display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', marginTop: 'auto' }}>
          <ExternalLink size={11} /> Source
        </a>
      )}
    </div>
  )
}

/* ── Detail card ────────────────────────────────────────── */
function DetailCard({ entry, theme: t, tagPill, compareMode, selected, onToggleCompare, onEdit, onAddToNotebook }) {
  return (
    <div onClick={compareMode ? onToggleCompare : onEdit} style={{
      background: t.surface1, border: `1px solid ${selected ? t.accent : t.border}`,
      borderRadius: '10px', padding: '20px', cursor: 'pointer',
      outline: selected ? `1px solid ${t.accent}` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: t.text, margin: 0 }}>{entry.title}</h3>
            {entry.year && <span style={{ fontSize: '11px', color: t.textMuted, background: t.surface3, padding: '1px 6px', borderRadius: '4px' }}>{entry.year}</span>}
          </div>
          {entry.authors?.length > 0 && <p style={{ fontSize: '12px', color: t.textMuted, margin: '4px 0 0' }}>{entry.authors.join(', ')}</p>}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onAddToNotebook() }} title="Add to Notebook" style={{ background: 'none', border: 'none', color: t.accent, cursor: 'pointer', display: 'flex', padding: '2px' }}>
            <BookOpen size={14} />
          </button>
          {entry.source_url && (
            <a href={entry.source_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: t.accent, display: 'flex', alignItems: 'center' }}>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
      {entry.abstract && (
        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '12px', marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Abstract</p>
          <p style={{ fontSize: '13px', color: t.textMuted, lineHeight: '1.7', margin: 0 }}>{entry.abstract}</p>
        </div>
      )}
      {entry.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {entry.tags.map(tag => <span key={tag} style={tagPill}>#{tag}</span>)}
        </div>
      )}
    </div>
  )
}

/* ── Tag chip input ─────────────────────────────────────── */
function TagChipInput({ value, onChange, theme: t }) {
  const chips = Array.isArray(value) ? value : []
  const [input, setInput] = useState('')

  function addChip(val) {
    const trimmed = val.trim().toLowerCase()
    if (!trimmed || chips.includes(trimmed)) { setInput(''); return }
    onChange([...chips, trimmed])
    setInput('')
  }

  function removeChip(chip) { onChange(chips.filter(c => c !== chip)) }

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: '6px', background: t.surface1, padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
      {chips.map(chip => (
        <span key={chip} style={{ display: 'flex', alignItems: 'center', gap: '3px', background: t.accentBg, border: `1px solid ${t.accent}40`, borderRadius: '12px', padding: '2px 8px', fontSize: '12px', color: t.accent }}>
          #{chip}
          <button onClick={() => removeChip(chip)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.accent, padding: 0, lineHeight: 1, fontSize: '12px' }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(input) }
          if (e.key === 'Backspace' && !input && chips.length) removeChip(chips[chips.length - 1])
        }}
        onBlur={() => { if (input.trim()) addChip(input) }}
        placeholder={chips.length ? '' : 'Add tag, press Enter'}
        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: t.text, minWidth: '80px', flex: 1 }}
      />
    </div>
  )
}

/* ── Add to notebook modal ──────────────────────────────── */
function AddToNotebookModal({ entry, theme: t, onClose }) {
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.from('subjects').select('*').order('created_at').then(({ data }) => { if (data) setSubjects(data) })
  }, [])

  async function addToNotebook() {
    if (!selectedSubject) return
    setSaving(true)
    const content = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Citation: ' }, { type: 'text', text: `${entry.authors?.join(', ') || 'Unknown'} ${entry.year ? `(${entry.year})` : ''}. ${entry.title}.` }] },
        ...(entry.source_url ? [{ type: 'paragraph', content: [{ type: 'text', text: `Source: ${entry.source_url}` }] }] : []),
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Abstract' }] },
        { type: 'paragraph', content: [{ type: 'text', text: entry.abstract || '' }] },
      ]
    }
    await supabase.from('notes').insert({ subject_id: selectedSubject, title: entry.title, content, color: '#818cf8' })
    setSaving(false)
    setDone(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: '12px', width: 'min(400px, calc(100vw - 32px))', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: t.text }}>Add to Notebook</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer' }}><X size={16} /></button>
        </div>
        {done ? (
          <p style={{ color: '#4ade80', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>✓ Added to notebook!</p>
        ) : (
          <>
            <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '14px' }}>Pick a subject — a note will be created with the citation and abstract pre-filled.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', maxHeight: '220px', overflowY: 'auto' }}>
              {subjects.length === 0 && <p style={{ fontSize: '12px', color: t.textFaint }}>No subjects yet. Create one in Notebook first.</p>}
              {subjects.map(s => (
                <div key={s.id} onClick={() => setSelectedSubject(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: selectedSubject === s.id ? t.accentBg : t.surface1, border: `1px solid ${selectedSubject === s.id ? t.accent : t.border}` }}>
                  <span style={{ fontSize: '16px' }}>{s.icon}</span>
                  <span style={{ fontSize: '13px', color: selectedSubject === s.id ? t.accent : t.textMuted }}>{s.name}</span>
                  <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={addToNotebook} disabled={!selectedSubject || saving} style={{ flex: 1, background: selectedSubject ? t.accentBtn : t.border, border: 'none', borderRadius: '8px', padding: '9px', color: 'white', fontSize: '13px', cursor: selectedSubject ? 'pointer' : 'not-allowed', fontWeight: '500' }}>
                {saving ? 'Adding...' : 'Add to Notebook'}
              </button>
              <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '9px 16px', color: t.textMuted, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Entry modal ────────────────────────────────────────── */
function EntryModal({ entry, theme: t, onClose, onSaved, onDelete }) {
  const isEdit = !!entry
  const [form, setForm] = useState({
    title: entry?.title || '',
    authors: entry?.authors?.join(', ') || '',
    abstract: entry?.abstract || '',
    year: entry?.year || '',
    source_url: entry?.source_url || '',
    tags: entry?.tags || [],
  })
  const [saving, setSaving] = useState(false)

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      authors: form.authors ? form.authors.split(',').map(a => a.trim()).filter(Boolean) : [],
      abstract: form.abstract.trim(),
      year: form.year ? parseInt(form.year) : null,
      source_url: form.source_url.trim(),
      tags: form.tags,
    }
    if (isEdit) {
      const { data } = await supabase.from('rrl_entries').update(payload).eq('id', entry.id).select().single()
      if (data) onSaved(data, false)
    } else {
      const { data } = await supabase.from('rrl_entries').insert(payload).select().single()
      if (data) onSaved(data, true)
    }
    setSaving(false)
  }

  const mInput = { width: '100%', background: t.surface1, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '8px 10px', color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const mLabel = { fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: '12px', width: 'min(540px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: t.text }}>{isEdit ? 'Edit Entry' : 'Add RRL Entry'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ flex: 1 }}>
            <label style={mLabel}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Paper or article title" style={{ ...mInput, marginTop: '6px' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={mLabel}>Authors (comma separated)</label>
            <input value={form.authors} onChange={e => set('authors', e.target.value)} placeholder="Juan dela Cruz, Maria Santos" style={{ ...mInput, marginTop: '6px' }} />
          </div>
          <div>
            <label style={mLabel}>Abstract</label>
            <textarea value={form.abstract} onChange={e => set('abstract', e.target.value)} placeholder="Paste the abstract here..." rows={5} style={{ ...mInput, resize: 'vertical', marginTop: '6px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={mLabel}>Year</label>
              <input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024" style={{ ...mInput, marginTop: '6px' }} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={mLabel}>Source URL</label>
              <input value={form.source_url} onChange={e => set('source_url', e.target.value)} placeholder="https://..." style={{ ...mInput, marginTop: '6px' }} />
            </div>
          </div>
          <div>
            <label style={mLabel}>Tags</label>
            <div style={{ marginTop: '6px' }}>
              <TagChipInput value={form.tags} onChange={v => set('tags', v)} theme={t} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: t.accentBtn, border: 'none', borderRadius: '8px', padding: '8px 16px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500', flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Entry'}
          </button>
          {isEdit && (
            <button onClick={() => onDelete(entry.id)} style={{ background: 'transparent', border: '1px solid #ef4444', borderRadius: '8px', padding: '8px 16px', color: '#ef4444', fontSize: '13px', cursor: 'pointer' }}>Delete</button>
          )}
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.textMuted, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
