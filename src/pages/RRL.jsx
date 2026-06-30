import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Search, Tag, ExternalLink, GitCompare, FileText, ChevronDown, ChevronUp } from 'lucide-react'

export default function RRL() {
  const [entries, setEntries] = useState([])
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelected, setCompareSelected] = useState([])

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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#e2e2e7' }}>RRL Compiler</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareSelected([]) }}
            style={{ ...compareMode ? primaryBtn : ghostBtn, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <GitCompare size={14} /> {compareMode ? 'Exit Compare' : 'Compare'}
          </button>
          <button onClick={() => { setEditEntry(null); setShowModal(true) }} style={primaryBtn}>
            <Plus size={15} /> Add Entry
          </button>
        </div>
      </div>

      {/* Search + tags */}
      <div style={{ padding: '16px 28px 0', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, author, abstract..."
            style={{ ...inputStyle, paddingLeft: '32px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag)} style={{
              padding: '4px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '500',
              background: activeTag === tag ? '#7c3aed' : '#1e1e2a',
              color: activeTag === tag ? 'white' : '#9ca3af',
            }}>
              {tag === 'all' ? 'All' : `#${tag}`}
            </button>
          ))}
        </div>
      </div>

      {/* Compare mode banner */}
      {compareMode && (
        <div style={{ margin: '12px 28px 0', padding: '10px 14px', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.4)', borderRadius: '8px', fontSize: '13px', color: '#c084fc' }}>
          Select 2–3 entries to compare. Selected: {compareSelected.length}/3
          {compareSelected.length >= 2 && (
            <button onClick={() => setCompareMode('view')} style={{ marginLeft: '12px', background: '#7c3aed', border: 'none', borderRadius: '6px', padding: '4px 12px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>
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
              <div key={entry.id} style={{ background: '#12121a', border: '1px solid #2a2a35', borderRadius: '10px', padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e2e2e7', marginBottom: '6px' }}>{entry.title}</h3>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{entry.authors?.join(', ')} {entry.year ? `(${entry.year})` : ''}</p>
                <div style={{ borderTop: '1px solid #2a2a35', paddingTop: '10px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', marginBottom: '6px' }}>Abstract</p>
                  <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.6' }}>{entry.abstract || 'No abstract.'}</p>
                </div>
                {entry.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {entry.tags.map(t => <span key={t} style={tagPill}>#{t}</span>)}
                  </div>
                )}
                {entry.source_url && (
                  <a href={entry.source_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px', fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
                    <ExternalLink size={12} /> View source
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Entry list */
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', gap: '12px', color: '#4b5563' }}>
              <FileText size={40} />
              <p style={{ fontSize: '14px' }}>No entries yet. Add your first reference!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  compareMode={compareMode === true}
                  selected={compareSelected.some(e => e.id === entry.id)}
                  onToggleCompare={() => toggleCompare(entry)}
                  onEdit={() => { setEditEntry(entry); setShowModal(true) }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <EntryModal
          entry={editEntry}
          onClose={() => setShowModal(false)}
          onSaved={onSaved}
          onDelete={deleteEntry}
        />
      )}
    </div>
  )
}

function EntryCard({ entry, compareMode, selected, onToggleCompare, onEdit }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: '#12121a', border: `1px solid ${selected ? '#7c3aed' : '#2a2a35'}`,
      borderRadius: '10px', padding: '16px', cursor: 'pointer',
      outline: selected ? '1px solid #7c3aed' : 'none',
    }}
      onClick={compareMode ? onToggleCompare : onEdit}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#e2e2e7', margin: 0 }}>{entry.title}</h3>
            {entry.year && <span style={{ fontSize: '11px', color: '#6b7280', background: '#1e1e2a', padding: '1px 6px', borderRadius: '4px' }}>{entry.year}</span>}
          </div>
          {entry.authors?.length > 0 && (
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>{entry.authors.join(', ')}</p>
          )}
          {entry.abstract && (
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '8px 0 0', lineHeight: '1.5', display: expanded ? 'block' : '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden' }}>
              {entry.abstract}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {entry.source_url && (
            <a href={entry.source_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#818cf8', display: 'flex' }}>
              <ExternalLink size={14} />
            </a>
          )}
          {entry.abstract && (
            <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', display: 'flex', padding: 0 }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>
      {entry.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
          {entry.tags.map(t => <span key={t} style={tagPill}>#{t}</span>)}
        </div>
      )}
    </div>
  )
}

function EntryModal({ entry, onClose, onSaved, onDelete }) {
  const isEdit = !!entry
  const [form, setForm] = useState({
    title: entry?.title || '',
    authors: entry?.authors?.join(', ') || '',
    abstract: entry?.abstract || '',
    year: entry?.year || '',
    source_url: entry?.source_url || '',
    tags: entry?.tags?.join(', ') || '',
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
      tags: form.tags ? form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#16161e', border: '1px solid #2a2a35', borderRadius: '12px', width: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e2e7' }}>{isEdit ? 'Edit Entry' : 'Add RRL Entry'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="Title *" value={form.title} onChange={v => set('title', v)} placeholder="Paper or article title" />
          <Field label="Authors (comma separated)" value={form.authors} onChange={v => set('authors', v)} placeholder="Juan dela Cruz, Maria Santos" />
          <div>
            <label style={labelStyle}>Abstract</label>
            <textarea value={form.abstract} onChange={e => set('abstract', e.target.value)} placeholder="Paste the abstract here..." rows={5} style={{ ...inputStyle, resize: 'vertical', marginTop: '6px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Field label="Year" value={form.year} onChange={v => set('year', v)} placeholder="2024" type="number" />
            <Field label="Source URL" value={form.source_url} onChange={v => set('source_url', v)} placeholder="https://..." />
          </div>
          <div>
            <label style={labelStyle}>Tags (comma separated)</label>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <Tag size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
              <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="methodology, qualitative, education" style={{ ...inputStyle, paddingLeft: '30px' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={save} disabled={saving} style={{ ...primaryBtn, flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Entry'}
          </button>
          {isEdit && (
            <button onClick={() => onDelete(entry.id)} style={{ ...ghostBtn, color: '#ef4444', borderColor: '#ef4444' }}>Delete</button>
          )}
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, marginTop: '6px' }} />
    </div>
  )
}

const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }
const inputStyle = {
  width: '100%', background: '#12121a', border: '1px solid #2a2a35', borderRadius: '6px',
  padding: '8px 10px', color: '#e2e2e7', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}
const primaryBtn = {
  display: 'flex', alignItems: 'center', gap: '6px',
  background: '#7c3aed', border: 'none', borderRadius: '8px',
  padding: '8px 16px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500',
}
const ghostBtn = {
  background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px',
  padding: '8px 16px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer',
}
const tagPill = {
  fontSize: '11px', color: '#818cf8', background: 'rgba(129,140,248,0.1)',
  padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(129,140,248,0.2)',
}
