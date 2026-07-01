import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { supabase } from '../lib/supabase'
import { Bold, Italic, List, ListOrdered, Heading2, Strikethrough, CheckSquare, Link2, Link2Off, Plus, X, StickyNote } from 'lucide-react'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'

const SAVE_DELAY = 1000

export default function NoteEditor({ note, onSave, theme = {} }) {
  const toolbarBg = theme.surface2 || '#16161e'
  const borderColor = theme.border || '#2a2a35'
  const titleColor = theme.text || '#e2e2e7'
  const editorTextColor = theme.textMuted || '#d1d5db'
  const editorHeadingColor = theme.text || '#e2e2e7'
  const placeholderColor = theme.textFaint || '#4b5563'
  const markerColor = theme.textMuted || '#9ca3af'
  const dividerColor = theme.border || '#2a2a35'
  const isDark = theme.dark !== false

  const [title, setTitle] = useState(note.title || '')
  const [saveStatus, setSaveStatus] = useState('saved')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [bubble, setBubble] = useState(null)
  const [sidenotes, setSidenotes] = useState([]) // [{id, paragraph_index, content}]
  const [hoveredPara, setHoveredPara] = useState(null) // paragraph index
  const [editingSidenote, setEditingSidenote] = useState(null) // {paraIndex, id?, content}
  const editorWrapRef = useRef(null)
  const saveTimer = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    ],
    content: note.content || {},
    onUpdate: () => {
      setSaveStatus('unsaved')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(saveContent, SAVE_DELAY)
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection
      if (from === to) { setBubble(null); return }
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) { setBubble(null); return }
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      setBubble({ x: rect.left + rect.width / 2, y: rect.top, hasLink: ed.isActive('link') })
    },
  })

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  useEffect(() => {
    function handleClick() { setBubble(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load sidenotes for this note
  useEffect(() => {
    async function fetchSidenotes() {
      const { data } = await supabase.from('sidenotes').select('*').eq('note_id', note.id).order('paragraph_index')
      if (data) setSidenotes(data)
    }
    fetchSidenotes()
  }, [note.id])

  // Track paragraph hover via mouse position over editor DOM
  const handleEditorMouseMove = useCallback((e) => {
    if (!editorWrapRef.current) return
    const paras = editorWrapRef.current.querySelectorAll('.tiptap > p, .tiptap > h2, .tiptap > ul, .tiptap > ol, .tiptap > blockquote')
    let found = null
    paras.forEach((el, i) => {
      const rect = el.getBoundingClientRect()
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) found = i
    })
    setHoveredPara(found)
  }, [])

  const handleEditorMouseLeave = useCallback(() => setHoveredPara(null), [])

  // Get top offset of paragraph by index (for positioning sidenote)
  function getParaTop(index) {
    if (!editorWrapRef.current) return 0
    const paras = editorWrapRef.current.querySelectorAll('.tiptap > p, .tiptap > h2, .tiptap > ul, .tiptap > ol, .tiptap > blockquote')
    if (!paras[index]) return 0
    const wrapRect = editorWrapRef.current.getBoundingClientRect()
    const paraRect = paras[index].getBoundingClientRect()
    return paraRect.top - wrapRect.top + editorWrapRef.current.scrollTop
  }

  async function saveSidenote(paraIndex, content, existingId) {
    if (!content.trim()) {
      if (existingId) {
        await supabase.from('sidenotes').delete().eq('id', existingId)
        setSidenotes(prev => prev.filter(s => s.id !== existingId))
      }
      setEditingSidenote(null)
      return
    }
    if (existingId) {
      const { data } = await supabase.from('sidenotes').update({ content }).eq('id', existingId).select().single()
      if (data) setSidenotes(prev => prev.map(s => s.id === existingId ? data : s))
    } else {
      const { data } = await supabase.from('sidenotes').insert({ note_id: note.id, paragraph_index: paraIndex, content }).select().single()
      if (data) setSidenotes(prev => [...prev, data])
    }
    setEditingSidenote(null)
  }

  async function deleteSidenote(id) {
    await supabase.from('sidenotes').delete().eq('id', id)
    setSidenotes(prev => prev.filter(s => s.id !== id))
    setEditingSidenote(null)
  }

  async function saveContent() {
    if (!editor) return
    const content = editor.getJSON()
    const { data } = await supabase
      .from('notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .select()
      .single()
    setSaveStatus('saved')
    if (data) onSave(data)
  }

  async function saveTitle(value) {
    setTitle(value)
    const { data } = await supabase
      .from('notes')
      .update({ title: value, updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .select()
      .single()
    if (data) onSave(data)
  }

  if (!editor) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '8px 16px', borderBottom: `1px solid ${borderColor}`,
        background: toolbarBg,
      }}>
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold" isDark={isDark}>
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic" isDark={isDark}>
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough" isDark={isDark}>
          <Strikethrough size={14} />
        </ToolBtn>
        <div style={{ width: '1px', height: '20px', background: dividerColor, margin: '0 4px' }} />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading" isDark={isDark}>
          <Heading2 size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list" isDark={isDark}>
          <List size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list" isDark={isDark}>
          <ListOrdered size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist" isDark={isDark}>
          <CheckSquare size={14} />
        </ToolBtn>
        <div style={{ width: '1px', height: '20px', background: dividerColor, margin: '0 4px' }} />
        <ToolBtn
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run()
            } else {
              setLinkUrl(editor.getAttributes('link').href || '')
              setShowLinkInput(p => !p)
            }
          }}
          active={editor.isActive('link')} title={editor.isActive('link') ? 'Remove link' : 'Add link'} isDark={isDark}>
          {editor.isActive('link') ? <Link2Off size={14} /> : <Link2 size={14} />}
        </ToolBtn>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: saveStatus === 'saved' ? (isDark ? '#4b5563' : '#9ca3af') : '#facc15' }}>
          {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
        </span>
      </div>

      {/* Link URL input */}
      {showLinkInput && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderBottom: `1px solid ${borderColor}`, background: toolbarBg }}>
          <Link2 size={13} style={{ color: theme.accent, flexShrink: 0 }} />
          <input
            autoFocus
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const url = linkUrl.trim()
                if (url) editor.chain().focus().setLink({ href: url.startsWith('http') ? url : `https://${url}` }).run()
                setShowLinkInput(false); setLinkUrl('')
              }
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl('') }
            }}
            placeholder="Paste URL and press Enter..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: theme.text }}
          />
          <button onClick={() => { setShowLinkInput(false); setLinkUrl('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, fontSize: '12px' }}>✕</button>
        </div>
      )}

      {/* Floating bubble on selection */}
      {bubble && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: bubble.x, top: bubble.y - 44,
            transform: 'translateX(-50%)',
            background: toolbarBg, border: `1px solid ${borderColor}`,
            borderRadius: '8px', padding: '4px 6px', display: 'flex', gap: '2px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)', zIndex: 9999,
          }}
        >
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold" isDark={isDark}><Bold size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic" isDark={isDark}><Italic size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike" isDark={isDark}><Strikethrough size={13} /></ToolBtn>
          <div style={{ width: '1px', height: '18px', background: borderColor, margin: '0 2px', alignSelf: 'center' }} />
          <ToolBtn
            onClick={() => {
              if (bubble.hasLink) {
                editor.chain().focus().unsetLink().run()
                setBubble(null)
              } else {
                const selectedText = editor.state.doc.textBetween(
                  editor.state.selection.from,
                  editor.state.selection.to
                ).trim()
                const looksLikeUrl = /^https?:\/\/|^www\./i.test(selectedText)
                if (looksLikeUrl) {
                  const href = selectedText.startsWith('http') ? selectedText : `https://${selectedText}`
                  editor.chain().focus().setLink({ href }).run()
                  setBubble(null)
                } else {
                  setLinkUrl('')
                  setShowLinkInput(true)
                  setBubble(null)
                }
              }
            }}
            active={bubble.hasLink} title={bubble.hasLink ? 'Remove link' : 'Make hyperlink'} isDark={isDark}>
            {bubble.hasLink ? <Link2Off size={13} /> : <Link2 size={13} />}
          </ToolBtn>
          <span style={{ fontSize: '11px', color: bubble.hasLink ? '#ef4444' : theme.textMuted, alignSelf: 'center', paddingRight: '2px' }}>
            {bubble.hasLink ? 'Remove' : 'Link'}
          </span>
        </div>
      )}

      {/* Title */}
      <input
        value={title}
        onChange={e => saveTitle(e.target.value)}
        placeholder="Note title"
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontSize: '24px', fontWeight: '700', color: titleColor,
          padding: '24px 32px 8px', width: '100%', boxSizing: 'border-box',
        }}
      />

      {/* Editor + sidenotes layout */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', position: 'relative' }}>
        {/* Editor column */}
        <div
          ref={editorWrapRef}
          onMouseMove={handleEditorMouseMove}
          onMouseLeave={handleEditorMouseLeave}
          style={{ flex: 1, padding: '0 16px 120px 32px', position: 'relative', minWidth: 0 }}
        >
          <style>{getEditorCSS(editorTextColor, editorHeadingColor, placeholderColor, markerColor)}</style>
          <EditorContent editor={editor} />

          {/* Hover + button per paragraph */}
          {hoveredPara !== null && (() => {
            const existing = sidenotes.find(s => s.paragraph_index === hoveredPara)
            if (existing) return null // already has sidenote, show in margin
            return (
              <button
                onMouseDown={e => {
                  e.preventDefault()
                  setEditingSidenote({ paraIndex: hoveredPara, id: null, content: '' })
                }}
                style={{
                  position: 'absolute', right: '-8px', top: getParaTop(hoveredPara) + 2,
                  background: theme.accentBg, border: `1px solid ${borderColor}`,
                  borderRadius: '50%', width: '22px', height: '22px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: theme.accent, zIndex: 10,
                }}
                title="Add sidenote"
              >
                <Plus size={12} />
              </button>
            )
          })()}
        </div>

        {/* Sidenotes margin column */}
        <div style={{ width: '180px', flexShrink: 0, position: 'relative', paddingTop: '0' }}>
          {sidenotes.map(s => (
            <div
              key={s.id}
              style={{
                position: 'absolute', top: getParaTop(s.paragraph_index),
                left: '8px', right: '4px',
              }}
            >
              {editingSidenote?.id === s.id ? (
                <SidenoteEditor
                  initial={s.content}
                  theme={theme}
                  borderColor={borderColor}
                  toolbarBg={toolbarBg}
                  onSave={content => saveSidenote(s.paragraph_index, content, s.id)}
                  onDelete={() => deleteSidenote(s.id)}
                  onCancel={() => setEditingSidenote(null)}
                />
              ) : (
                <div
                  onClick={() => setEditingSidenote({ paraIndex: s.paragraph_index, id: s.id, content: s.content })}
                  style={{
                    background: theme.surface3 || theme.surface2,
                    border: `1px solid ${borderColor}`,
                    borderLeft: `3px solid ${theme.accent}`,
                    borderRadius: '6px', padding: '6px 8px', cursor: 'pointer',
                    fontSize: '11px', color: theme.textMuted, lineHeight: 1.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <StickyNote size={10} style={{ color: theme.accent, flexShrink: 0, marginTop: '2px' }} />
                    <span>{s.content}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New sidenote editor */}
          {editingSidenote && !editingSidenote.id && (
            <div style={{ position: 'absolute', top: getParaTop(editingSidenote.paraIndex), left: '8px', right: '4px' }}>
              <SidenoteEditor
                initial=""
                theme={theme}
                borderColor={borderColor}
                toolbarBg={toolbarBg}
                onSave={content => saveSidenote(editingSidenote.paraIndex, content, null)}
                onDelete={null}
                onCancel={() => setEditingSidenote(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SidenoteEditor({ initial, theme, borderColor, toolbarBg, onSave, onDelete, onCancel }) {
  const [val, setVal] = useState(initial)
  return (
    <div style={{
      background: toolbarBg, border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${theme.accent}`, borderRadius: '6px', padding: '6px 8px',
    }}>
      <textarea
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(val) }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Add a sidenote..."
        rows={3}
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
          fontSize: '11px', color: theme.text, lineHeight: 1.5, boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <button onClick={() => onSave(val)} style={{ fontSize: '10px', padding: '2px 8px', background: theme.accent, border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>Save</button>
        {onDelete && <button onClick={onDelete} style={{ fontSize: '10px', padding: '2px 8px', background: 'none', border: `1px solid #ef4444`, borderRadius: '4px', color: '#ef4444', cursor: 'pointer' }}>Delete</button>}
        <button onClick={onCancel} style={{ fontSize: '10px', padding: '2px 8px', background: 'none', border: `1px solid ${borderColor}`, borderRadius: '4px', color: theme.textMuted, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function ToolBtn({ onClick, active, children, title, isDark }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? 'rgba(192,132,252,0.15)' : 'transparent',
        border: 'none', borderRadius: '5px', padding: '5px 6px',
        color: active ? '#c084fc' : (isDark ? '#9ca3af' : '#555570'),
        cursor: 'pointer', display: 'flex', alignItems: 'center',
      }}
    >
      {children}
    </button>
  )
}

function getEditorCSS(text, heading, placeholder, marker) {
  return `
.tiptap { outline: none; font-size: 15px; line-height: 1.7; color: ${text}; min-height: 300px; }
.tiptap p { margin: 0 0 8px; }
.tiptap h2 { font-size: 20px; font-weight: 600; color: ${heading}; margin: 20px 0 8px; }
.tiptap ul { padding-left: 20px; margin: 0 0 8px; list-style-type: disc; }
.tiptap ol { padding-left: 20px; margin: 0 0 8px; list-style-type: decimal; }
.tiptap li { margin-bottom: 4px; }
.tiptap ul li::marker, .tiptap ol li::marker { color: ${marker}; }
.tiptap strong { color: ${heading}; }
.tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: ${placeholder}; pointer-events: none; float: left; height: 0; }
.tiptap ul[data-type="taskList"] { list-style: none; padding-left: 0; }
.tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
.tiptap ul[data-type="taskList"] li label { margin-top: 2px; }
.tiptap ul[data-type="taskList"] li input[type="checkbox"] { accent-color: #c084fc; cursor: pointer; }
.tiptap a { color: ${marker}; text-decoration: underline; cursor: pointer; }
.tiptap a:hover { opacity: 0.8; }
`
}
