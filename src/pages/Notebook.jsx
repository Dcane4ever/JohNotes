import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import NoteEditor from '../components/NoteEditor'
import { Plus, Trash2, FileText, ChevronRight } from 'lucide-react'

const COLORS = ['#c084fc', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#818cf8']
const ICONS = ['📓', '📚', '🔬', '💻', '🎨', '📐', '🧪', '📖', '✏️', '🗂️']

export default function Notebook({ theme = 'dark' }) {
  const isDark = theme === 'dark'
  const panelBg1 = isDark ? '#12121a' : '#e8e8f0'
  const panelBg2 = isDark ? '#16161e' : '#ededf5'
  const borderColor = isDark ? '#2a2a35' : '#d4d4e0'
  const textMuted = isDark ? '#9ca3af' : '#6b7280'
  const textActive = isDark ? '#e2e2e7' : '#1a1a2e'
  const inputBg = isDark ? '#1e1e2a' : '#dcdce8'
  const [subjects, setSubjects] = useState([])
  const [notes, setNotes] = useState([])
  const [activeSubject, setActiveSubject] = useState(null)
  const [activeNote, setActiveNote] = useState(null)
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectColor, setNewSubjectColor] = useState(COLORS[0])
  const [newSubjectIcon, setNewSubjectIcon] = useState(ICONS[0])

  useEffect(() => { fetchSubjects() }, [])

  useEffect(() => {
    if (activeSubject) fetchNotes(activeSubject.id)
    else setNotes([])
  }, [activeSubject])

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('*').order('created_at')
    if (data) setSubjects(data)
  }

  async function fetchNotes(subjectId) {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('subject_id', subjectId)
      .order('updated_at', { ascending: false })
    if (data) setNotes(data)
  }

  async function createSubject() {
    if (!newSubjectName.trim()) return
    const { data } = await supabase.from('subjects').insert({
      name: newSubjectName.trim(),
      color: newSubjectColor,
      icon: newSubjectIcon,
    }).select().single()
    if (data) {
      setSubjects(prev => [...prev, data])
      setActiveSubject(data)
      setActiveNote(null)
    }
    setNewSubjectName('')
    setShowNewSubject(false)
  }

  async function deleteSubject(id, e) {
    e.stopPropagation()
    await supabase.from('subjects').delete().eq('id', id)
    setSubjects(prev => prev.filter(s => s.id !== id))
    if (activeSubject?.id === id) { setActiveSubject(null); setActiveNote(null) }
  }

  async function createNote() {
    if (!activeSubject) return
    const { data } = await supabase.from('notes').insert({
      subject_id: activeSubject.id,
      title: 'Untitled',
      content: {},
    }).select().single()
    if (data) {
      setNotes(prev => [data, ...prev])
      setActiveNote(data)
    }
  }

  async function deleteNote(id, e) {
    e.stopPropagation()
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeNote?.id === id) setActiveNote(null)
  }

  function onNoteSaved(updated) {
    setNotes(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n))
    setActiveNote(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* Subjects panel */}
      <div style={{
        width: '200px', background: panelBg1, borderRight: `1px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '16px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subjects</span>
          <button onClick={() => setShowNewSubject(true)} style={iconBtn}>
            <Plus size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {subjects.map(s => (
            <div
              key={s.id}
              onClick={() => { setActiveSubject(s); setActiveNote(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 8px',
                borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
                background: activeSubject?.id === s.id ? 'rgba(192,132,252,0.1)' : 'transparent',
                borderLeft: activeSubject?.id === s.id ? `3px solid ${s.color}` : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '16px' }}>{s.icon}</span>
              <span style={{ flex: 1, fontSize: '13px', color: activeSubject?.id === s.id ? textActive : textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <button onClick={(e) => deleteSubject(s.id, e)} style={{ ...iconBtn, opacity: 0.4, color: '#ef4444' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* New subject form */}
        {showNewSubject && (
          <div style={{ padding: '12px', borderTop: `1px solid ${borderColor}` }}>
            <input
              autoFocus
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createSubject(); if (e.key === 'Escape') setShowNewSubject(false) }}
              placeholder="Subject name"
              style={{ ...inputStyle, background: inputBg, border: `1px solid ${borderColor}`, color: textActive }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setNewSubjectColor(c)} style={{
                  width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer',
                  outline: newSubjectColor === c ? `2px solid white` : 'none', outlineOffset: '1px',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <span key={ic} onClick={() => setNewSubjectIcon(ic)} style={{
                  fontSize: '16px', cursor: 'pointer', padding: '2px',
                  background: newSubjectIcon === ic ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderRadius: '4px',
                }}>{ic}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button onClick={createSubject} style={primaryBtn}>Add</button>
              <button onClick={() => setShowNewSubject(false)} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Notes list */}
      <div style={{
        width: '220px', background: panelBg2, borderRight: `1px solid ${borderColor}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '16px 12px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {activeSubject ? activeSubject.name : 'Notes'}
          </span>
          {activeSubject && (
            <button onClick={createNote} style={iconBtn}>
              <Plus size={14} />
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {!activeSubject && (
            <p style={{ fontSize: '12px', color: '#4b5563', padding: '8px', textAlign: 'center' }}>Select a subject</p>
          )}
          {notes.map(n => (
            <div
              key={n.id}
              onClick={() => setActiveNote(n)}
              style={{
                padding: '10px 8px', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px',
                background: activeNote?.id === n.id ? 'rgba(192,132,252,0.1)' : 'transparent',
                borderLeft: activeNote?.id === n.id ? '3px solid #c084fc' : '3px solid transparent',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <FileText size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '13px', color: activeNote?.id === n.id ? textActive : textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.title || 'Untitled'}
              </span>
              <button onClick={(e) => deleteNote(n.id, e)} style={{ ...iconBtn, opacity: 0.4, color: '#ef4444' }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {activeNote ? (
          <NoteEditor key={activeNote.id} note={activeNote} onSave={onNoteSaved} theme={theme} />
        ) : (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#4b5563', pointerEvents: 'none', zIndex: 0 }}>
            <ChevronRight size={32} />
            <p style={{ fontSize: '14px' }}>{activeSubject ? 'Select or create a note' : 'Select a subject to start'}</p>
          </div>
        )}
      </div>

    </div>
  )
}

const iconBtn = {
  background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
  padding: '2px', display: 'flex', alignItems: 'center', borderRadius: '4px',
}
const inputStyle = {
  width: '100%', background: 'var(--input-bg, #1e1e2a)', border: '1px solid #2a2a35', borderRadius: '6px',
  padding: '6px 8px', color: 'inherit', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}
const primaryBtn = {
  flex: 1, background: '#7c3aed', border: 'none', borderRadius: '6px',
  padding: '6px', color: 'white', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
}
const ghostBtn = {
  flex: 1, background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px',
  padding: '6px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer',
}
