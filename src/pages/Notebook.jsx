import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import NoteEditor from '../components/NoteEditor'
import { Plus, FileText, ChevronRight, ChevronLeft, PanelLeftClose, PanelLeftOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

const COLORS = ['#c084fc', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#818cf8', '#f87171']
const NOTE_COLORS = ['#c084fc', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#818cf8', '#f87171', '#94a3b8']
const ICONS = ['📓', '📚', '🔬', '💻', '🎨', '📐', '🧪', '📖', '✏️', '🗂️']

export default function Notebook({ theme = {} }) {
  const panelBg1 = theme.surface1 || '#12121a'
  const panelBg2 = theme.surface2 || '#16161e'
  const borderColor = theme.border || '#2a2a35'
  const textMuted = theme.textMuted || '#9ca3af'
  const textActive = theme.text || '#e2e2e7'
  const inputBg = theme.surface3 || '#1e1e2a'
  const menuBg = theme.surface3 || '#1e1e2a'

  const [subjects, setSubjects] = useState([])
  const [notes, setNotes] = useState([])
  const [activeSubject, setActiveSubject] = useState(null)
  const [activeNote, setActiveNote] = useState(null)
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectColor, setNewSubjectColor] = useState(COLORS[0])
  const [newSubjectIcon, setNewSubjectIcon] = useState(ICONS[0])
  const [subjectsCollapsed, setSubjectsCollapsed] = useState(false)
  const [notesCollapsed, setNotesCollapsed] = useState(false)
  const [subjectMenu, setSubjectMenu] = useState(null) // id of subject with open menu
  const [noteMenu, setNoteMenu] = useState(null)       // id of note with open menu
  const [renamingSubject, setRenamingSubject] = useState(null)
  const [renamingNote, setRenamingNote] = useState(null)
  const [renameVal, setRenameVal] = useState('')

  useEffect(() => { fetchSubjects() }, [])
  useEffect(() => {
    if (activeSubject) fetchNotes(activeSubject.id)
    else setNotes([])
  }, [activeSubject])

  // close menus on outside click
  useEffect(() => {
    function close() { setSubjectMenu(null); setNoteMenu(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('*').order('created_at')
    if (data) setSubjects(data)
  }

  async function fetchNotes(subjectId) {
    const { data } = await supabase.from('notes').select('*').eq('subject_id', subjectId).order('updated_at', { ascending: false })
    if (data) setNotes(data)
  }

  async function createSubject() {
    if (!newSubjectName.trim()) return
    const { data } = await supabase.from('subjects').insert({ name: newSubjectName.trim(), color: newSubjectColor, icon: newSubjectIcon }).select().single()
    if (data) { setSubjects(prev => [...prev, data]); setActiveSubject(data); setActiveNote(null) }
    setNewSubjectName(''); setShowNewSubject(false)
  }

  async function deleteSubject(id) {
    await supabase.from('subjects').delete().eq('id', id)
    setSubjects(prev => prev.filter(s => s.id !== id))
    if (activeSubject?.id === id) { setActiveSubject(null); setActiveNote(null) }
  }

  async function setSubjectColor(id, color) {
    const { data } = await supabase.from('subjects').update({ color }).eq('id', id).select().single()
    if (data) setSubjects(prev => prev.map(s => s.id === id ? data : s))
  }

  async function renameSubject(id) {
    if (!renameVal.trim()) return
    const { data } = await supabase.from('subjects').update({ name: renameVal.trim() }).eq('id', id).select().single()
    if (data) setSubjects(prev => prev.map(s => s.id === id ? data : s))
    setRenamingSubject(null); setRenameVal('')
  }

  async function createNote() {
    if (!activeSubject) return
    const { data } = await supabase.from('notes').insert({ subject_id: activeSubject.id, title: 'Untitled', content: {}, color: NOTE_COLORS[0] }).select().single()
    if (data) { setNotes(prev => [data, ...prev]); setActiveNote(data) }
  }

  async function deleteNote(id) {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeNote?.id === id) setActiveNote(null)
  }

  async function renameNote(id) {
    if (!renameVal.trim()) return
    const { data } = await supabase.from('notes').update({ title: renameVal.trim() }).eq('id', id).select().single()
    if (data) {
      setNotes(prev => prev.map(n => n.id === id ? data : n))
      if (activeNote?.id === id) setActiveNote(data)
    }
    setRenamingNote(null); setRenameVal('')
  }

  async function setNoteColor(id, color) {
    const { data } = await supabase.from('notes').update({ color }).eq('id', id).select().single()
    if (data) setNotes(prev => prev.map(n => n.id === id ? data : n))
  }

  function onNoteSaved(updated) {
    setNotes(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n))
    setActiveNote(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* Subjects panel */}
      <div style={{
        width: subjectsCollapsed ? '36px' : '200px', background: panelBg1,
        borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column',
        flexShrink: 0, transition: 'width 0.2s ease', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          {!subjectsCollapsed && (
            <span style={{ fontSize: '11px', fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subjects</span>
          )}
          <div style={{ display: 'flex', gap: '2px', marginLeft: subjectsCollapsed ? 'auto' : 0 }}>
            {!subjectsCollapsed && (
              <button onClick={() => setShowNewSubject(true)} style={mkIconBtn(textMuted)}><Plus size={13} /></button>
            )}
            <button onClick={() => setSubjectsCollapsed(p => !p)} style={mkIconBtn(textMuted)} title={subjectsCollapsed ? 'Expand' : 'Collapse'}>
              {subjectsCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>
        </div>

        {!subjectsCollapsed && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
              {subjects.map(s => (
                <div key={s.id} style={{ position: 'relative' }}>
                  {renamingSubject === s.id ? (
                    <input
                      autoFocus value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameSubject(s.id); if (e.key === 'Escape') setRenamingSubject(null) }}
                      onBlur={() => renameSubject(s.id)}
                      style={{ ...inlineInput(inputBg, borderColor, textActive), margin: '2px 0' }}
                    />
                  ) : (
                    <div
                      onClick={() => { setActiveSubject(s); setActiveNote(null) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 6px',
                        borderRadius: '6px', cursor: 'pointer', marginBottom: '1px',
                        background: activeSubject?.id === s.id ? 'rgba(192,132,252,0.1)' : 'transparent',
                        borderLeft: activeSubject?.id === s.id ? `3px solid ${s.color}` : '3px solid transparent',
                        position: 'relative',
                      }}
                      onMouseEnter={e => e.currentTarget.querySelector('.smenu-btn').style.opacity = '1'}
                      onMouseLeave={e => { if (subjectMenu !== s.id) e.currentTarget.querySelector('.smenu-btn').style.opacity = '0' }}
                    >
                      <span style={{ fontSize: '15px' }}>{s.icon}</span>
                      <span style={{ flex: 1, fontSize: '12px', color: activeSubject?.id === s.id ? textActive : textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      <button
                        className="smenu-btn"
                        onClick={e => { e.stopPropagation(); setSubjectMenu(subjectMenu === s.id ? null : s.id) }}
                        style={{ ...mkIconBtn(textMuted), opacity: subjectMenu === s.id ? '1' : '0', transition: 'opacity 0.1s', padding: '2px' }}
                      >
                        <MoreHorizontal size={12} />
                      </button>
                    </div>
                  )}

                  {/* Subject context menu */}
                  {subjectMenu === s.id && (
                    <div onClick={e => e.stopPropagation()} style={contextMenu(menuBg, borderColor)}>
                      <button onClick={() => { setRenamingSubject(s.id); setRenameVal(s.name); setSubjectMenu(null) }} style={menuItem(textActive)}>
                        <Pencil size={12} /> Rename
                      </button>
                      <div style={{ padding: '6px 10px', borderTop: `1px solid ${borderColor}` }}>
                        <p style={{ fontSize: '10px', color: textMuted, marginBottom: '5px' }}>Color</p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {COLORS.map(c => (
                            <div key={c} onClick={() => setSubjectColor(s.id, c)} style={{
                              width: '14px', height: '14px', borderRadius: '50%', background: c, cursor: 'pointer',
                              outline: s.color === c ? '2px solid white' : 'none', outlineOffset: '1px',
                            }} />
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
                          <label title="Custom color" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: s.color, border: '1px solid rgba(255,255,255,0.2)' }} />
                            <span style={{ fontSize: '10px', color: textMuted, fontFamily: 'monospace' }}>{s.color}</span>
                            <input type="color" value={s.color} onChange={e => setSubjectColor(s.id, e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                          </label>
                        </div>
                      </div>
                      <button onClick={() => { deleteSubject(s.id); setSubjectMenu(null) }} style={{ ...menuItem(textActive), color: '#ef4444', borderTop: `1px solid ${borderColor}` }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {showNewSubject && (
              <div style={{ padding: '10px 8px', borderTop: `1px solid ${borderColor}` }}>
                <input autoFocus value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createSubject(); if (e.key === 'Escape') setShowNewSubject(false) }}
                  placeholder="Subject name"
                  style={{ ...inlineInput(inputBg, borderColor, textActive) }}
                />
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setNewSubjectColor(c)} style={{
                      width: '16px', height: '16px', borderRadius: '50%', background: c, cursor: 'pointer',
                      outline: newSubjectColor === c ? '2px solid white' : 'none', outlineOffset: '1px',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <label title="Custom color" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: newSubjectColor, border: '1px solid rgba(255,255,255,0.2)' }} />
                    <span style={{ fontSize: '10px', color: textMuted, fontFamily: 'monospace' }}>{newSubjectColor}</span>
                    <input type="color" value={newSubjectColor} onChange={e => setNewSubjectColor(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '3px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {ICONS.map(ic => (
                    <span key={ic} onClick={() => setNewSubjectIcon(ic)} style={{
                      fontSize: '14px', cursor: 'pointer', padding: '2px',
                      background: newSubjectIcon === ic ? 'rgba(255,255,255,0.15)' : 'transparent', borderRadius: '4px',
                    }}>{ic}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button onClick={createSubject} style={primaryBtn}>Add</button>
                  <button onClick={() => setShowNewSubject(false)} style={ghostBtn(borderColor)}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes list panel */}
      <div style={{
        width: notesCollapsed ? '36px' : '220px', background: panelBg2,
        borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column',
        flexShrink: 0, transition: 'width 0.2s ease', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          {!notesCollapsed && (
            <span style={{ fontSize: '11px', fontWeight: '600', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {activeSubject ? activeSubject.name : 'Notes'}
            </span>
          )}
          <div style={{ display: 'flex', gap: '2px', marginLeft: notesCollapsed ? 'auto' : 0 }}>
            {!notesCollapsed && activeSubject && (
              <button onClick={createNote} style={mkIconBtn(textMuted)}><Plus size={13} /></button>
            )}
            <button onClick={() => setNotesCollapsed(p => !p)} style={mkIconBtn(textMuted)} title={notesCollapsed ? 'Expand' : 'Collapse'}>
              {notesCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
            </button>
          </div>
        </div>

        {!notesCollapsed && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
            {!activeSubject && (
              <p style={{ fontSize: '11px', color: textMuted, padding: '8px', textAlign: 'center' }}>Select a subject</p>
            )}
            {notes.map(n => (
              <div key={n.id} style={{ position: 'relative' }}>
                {renamingNote === n.id ? (
                  <input autoFocus value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameNote(n.id); if (e.key === 'Escape') setRenamingNote(null) }}
                    onBlur={() => renameNote(n.id)}
                    style={{ ...inlineInput(inputBg, borderColor, textActive), margin: '2px 0' }}
                  />
                ) : (
                  <div
                    onClick={() => setActiveNote(n)}
                    style={{
                      padding: '8px 6px', borderRadius: '6px', cursor: 'pointer', marginBottom: '1px',
                      background: activeNote?.id === n.id ? 'rgba(192,132,252,0.1)' : 'transparent',
                      borderLeft: activeNote?.id === n.id ? `3px solid ${n.color || '#c084fc'}` : `3px solid ${n.color || 'transparent'}`,
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                    onMouseEnter={e => e.currentTarget.querySelector('.nmenu-btn').style.opacity = '1'}
                    onMouseLeave={e => { if (noteMenu !== n.id) e.currentTarget.querySelector('.nmenu-btn').style.opacity = '0' }}
                  >
                    <FileText size={12} style={{ color: n.color || '#6b7280', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '12px', color: activeNote?.id === n.id ? textActive : textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.title || 'Untitled'}
                    </span>
                    <button
                      className="nmenu-btn"
                      onClick={e => { e.stopPropagation(); setNoteMenu(noteMenu === n.id ? null : n.id) }}
                      style={{ ...mkIconBtn(textMuted), opacity: noteMenu === n.id ? '1' : '0', transition: 'opacity 0.1s', padding: '2px' }}
                    >
                      <MoreHorizontal size={12} />
                    </button>
                  </div>
                )}

                {/* Note context menu */}
                {noteMenu === n.id && (
                  <div onClick={e => e.stopPropagation()} style={contextMenu(menuBg, borderColor)}>
                    <button onClick={() => { setRenamingNote(n.id); setRenameVal(n.title || ''); setNoteMenu(null) }} style={menuItem(textActive)}>
                      <Pencil size={12} /> Rename
                    </button>
                    <div style={{ padding: '6px 10px', borderTop: `1px solid ${borderColor}` }}>
                      <p style={{ fontSize: '10px', color: textMuted, marginBottom: '5px' }}>Color</p>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {NOTE_COLORS.map(c => (
                          <div key={c} onClick={() => { setNoteColor(n.id, c); setNoteMenu(null) }} style={{
                            width: '16px', height: '16px', borderRadius: '50%', background: c, cursor: 'pointer',
                            outline: n.color === c ? '2px solid white' : 'none', outlineOffset: '1px',
                          }} />
                        ))}
                      </div>
                    </div>
                    <button onClick={() => { deleteNote(n.id); setNoteMenu(null) }} style={{ ...menuItem(textActive), color: '#ef4444', borderTop: `1px solid ${borderColor}` }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

const mkIconBtn = (color) => ({
  background: 'none', border: 'none', color, cursor: 'pointer',
  padding: '3px', display: 'flex', alignItems: 'center', borderRadius: '4px',
})

const inlineInput = (bg, border, color) => ({
  width: '100%', background: bg, border: `1px solid ${border}`, borderRadius: '5px',
  padding: '5px 7px', color, fontSize: '12px', outline: 'none', boxSizing: 'border-box',
})

const contextMenu = (bg, border) => ({
  position: 'absolute', right: 0, top: '100%', zIndex: 50,
  background: bg, border: `1px solid ${border}`, borderRadius: '8px',
  minWidth: '140px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden',
})

const menuItem = (color) => ({
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
  padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '12px', color, textAlign: 'left',
})

const primaryBtn = {
  flex: 1, background: '#7c3aed', border: 'none', borderRadius: '6px',
  padding: '6px', color: 'white', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
}

const ghostBtn = (border) => ({
  flex: 1, background: 'transparent', border: `1px solid ${border}`, borderRadius: '6px',
  padding: '6px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer',
})
