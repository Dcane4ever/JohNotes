import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle } from '@tiptap/extension-text-style'
import { supabase } from '../lib/supabase'
import { Bold, Italic, List, ListOrdered, Heading2, Strikethrough, CheckSquare, Link2, Link2Off, Plus, StickyNote, Highlighter } from 'lucide-react'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'

const SAVE_DELAY = 1000

const HIGHLIGHT_COLORS = [
  { color: '#fde68a', label: 'Yellow' },
  { color: '#bbf7d0', label: 'Green' },
  { color: '#bfdbfe', label: 'Blue' },
  { color: '#fecaca', label: 'Red' },
  { color: '#e9d5ff', label: 'Purple' },
  { color: '#fed7aa', label: 'Orange' },
]

const SLASH_COMMANDS = [
  { label: 'Text', description: 'Plain paragraph', icon: '¶', action: (ed) => ed.chain().focus().setParagraph().run() },
  { label: 'Heading', description: 'Large section title', icon: 'H', action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Bullet List', description: 'Unordered list', icon: '•', action: (ed) => ed.chain().focus().toggleBulletList().run() },
  { label: 'Numbered List', description: 'Ordered list', icon: '1.', action: (ed) => ed.chain().focus().toggleOrderedList().run() },
  { label: 'Checklist', description: 'Task items', icon: '☐', action: (ed) => ed.chain().focus().toggleTaskList().run() },
  { label: 'Quote', description: 'Block quotation', icon: '"', action: (ed) => ed.chain().focus().toggleBlockquote().run() },
]

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
  const [bubble, setBubble] = useState(null) // {x, y, hasLink}
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [sidenotes, setSidenotes] = useState([])
  const [hoveredPara, setHoveredPara] = useState(null)
  const [editingSidenote, setEditingSidenote] = useState(null)
  // Slash command state
  const [slashMenu, setSlashMenu] = useState(null) // {x, y, query, from}
  const [slashIndex, setSlashIndex] = useState(0)

  const editorWrapRef = useRef(null)
  const saveTimer = useRef(null)

  // Custom slash command extension
  const SlashExtension = Extension.create({
    name: 'slashCommand',
    addKeyboardShortcuts() {
      return {
        '/': () => {
          const { state } = this.editor
          const { from } = state.selection
          const coords = this.editor.view.coordsAtPos(from)
          setSlashMenu({ x: coords.left, y: coords.bottom + 4, query: '', from })
          setSlashIndex(0)
          return false // let / be inserted
        },
      }
    },
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Placeholder.configure({ placeholder: "Start writing... type '/' for commands" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      SlashExtension,
    ],
    content: note.content || {},
    onUpdate: ({ editor: ed }) => {
      setSaveStatus('unsaved')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(saveContent, SAVE_DELAY)

      // Update slash menu query based on text after /
      if (slashMenu) {
        const { from } = ed.state.selection
        const textFrom = slashMenu.from
        const text = ed.state.doc.textBetween(textFrom, from, '')
        // text starts with '/' — query is what follows
        if (text.startsWith('/')) {
          const query = text.slice(1).toLowerCase()
          setSlashMenu(prev => prev ? { ...prev, query } : null)
          setSlashIndex(0)
        } else {
          setSlashMenu(null)
        }
      }
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
    function handleClick() {
      setBubble(null)
      setSlashMenu(null)
      setShowHighlightPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Slash menu keyboard nav
  useEffect(() => {
    if (!slashMenu) return
    function onKey(e) {
      const filtered = getFilteredCommands(slashMenu.query)
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => (i + 1) % filtered.length) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => (i - 1 + filtered.length) % filtered.length) }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[slashIndex]) runSlashCommand(filtered[slashIndex])
      }
      if (e.key === 'Escape') setSlashMenu(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [slashMenu, slashIndex])

  function getFilteredCommands(query) {
    if (!query) return SLASH_COMMANDS
    return SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(query) || c.description.toLowerCase().includes(query))
  }

  function runSlashCommand(cmd) {
    if (!editor || !slashMenu) return
    // Delete the /query text first
    const { from } = editor.state.selection
    editor.chain().focus()
      .deleteRange({ from: slashMenu.from, to: from })
      .run()
    cmd.action(editor)
    setSlashMenu(null)
  }

  // Load sidenotes
  useEffect(() => {
    async function fetchSidenotes() {
      const { data } = await supabase.from('sidenotes').select('*').eq('note_id', note.id).order('paragraph_index')
      if (data) setSidenotes(data)
    }
    fetchSidenotes()
  }, [note.id])

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
    const { data } = await supabase.from('notes').update({ content, updated_at: new Date().toISOString() }).eq('id', note.id).select().single()
    setSaveStatus('saved')
    if (data) onSave(data)
  }

  async function saveTitle(value) {
    setTitle(value)
    const { data } = await supabase.from('notes').update({ title: value, updated_at: new Date().toISOString() }).eq('id', note.id).select().single()
    if (data) onSave(data)
  }

  if (!editor) return null

  const filteredSlash = slashMenu ? getFilteredCommands(slashMenu.query) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2px',
        padding: '8px 16px', borderBottom: `1px solid ${borderColor}`,
        background: toolbarBg,
      }}>
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold" theme={theme}><Bold size={14} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic" theme={theme}><Italic size={14} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough" theme={theme}><Strikethrough size={14} /></ToolBtn>

        {/* Highlight button with color picker */}
        <div style={{ position: 'relative' }}>
          <ToolBtn
            onClick={() => setShowHighlightPicker(p => !p)}
            active={editor.isActive('highlight')}
            title="Highlight"
            theme={theme}
          >
            <Highlighter size={14} />
          </ToolBtn>
          {showHighlightPicker && (
            <div
              onMouseDown={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: '32px', left: 0, zIndex: 9999,
                background: toolbarBg, border: `1px solid ${borderColor}`,
                borderRadius: '8px', padding: '8px', display: 'flex', gap: '6px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <button
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false) }}
                title="Remove highlight"
                style={{ width: '20px', height: '20px', borderRadius: '4px', border: `1px solid ${borderColor}`, background: 'transparent', cursor: 'pointer', fontSize: '10px', color: theme.textMuted }}
              >✕</button>
              {HIGHLIGHT_COLORS.map(h => (
                <button
                  key={h.color}
                  onClick={() => { editor.chain().focus().setHighlight({ color: h.color }).run(); setShowHighlightPicker(false) }}
                  title={h.label}
                  style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${editor.isActive('highlight', { color: h.color }) ? theme.accent : 'transparent'}`, background: h.color, cursor: 'pointer' }}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '20px', background: dividerColor, margin: '0 4px' }} />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading" theme={theme}><Heading2 size={14} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list" theme={theme}><List size={14} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list" theme={theme}><ListOrdered size={14} /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist" theme={theme}><CheckSquare size={14} /></ToolBtn>
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
          active={editor.isActive('link')} title={editor.isActive('link') ? 'Remove link' : 'Add link'} theme={theme}>
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

      {/* Floating bubble on text selection */}
      {bubble && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: bubble.x, top: bubble.y - 44,
            transform: 'translateX(-50%)',
            background: toolbarBg, border: `1px solid ${borderColor}`,
            borderRadius: '8px', padding: '4px 6px', display: 'flex', gap: '2px', alignItems: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)', zIndex: 9999,
          }}
        >
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold" theme={theme}><Bold size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic" theme={theme}><Italic size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strike" theme={theme}><Strikethrough size={13} /></ToolBtn>

          {/* Inline highlight swatches in bubble */}
          <div style={{ width: '1px', height: '18px', background: borderColor, margin: '0 2px' }} />
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            {HIGHLIGHT_COLORS.map(h => (
              <button
                key={h.color}
                onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHighlight({ color: h.color }).run() }}
                title={`Highlight ${h.label}`}
                style={{
                  width: '14px', height: '14px', borderRadius: '3px', border: `1px solid rgba(0,0,0,0.15)`,
                  background: h.color, cursor: 'pointer', padding: 0,
                }}
              />
            ))}
            <button
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run() }}
              title="Remove highlight"
              style={{ width: '14px', height: '14px', borderRadius: '3px', border: `1px solid ${borderColor}`, background: 'transparent', cursor: 'pointer', fontSize: '9px', color: theme.textMuted, padding: 0, lineHeight: 1 }}
            >✕</button>
          </div>

          <div style={{ width: '1px', height: '18px', background: borderColor, margin: '0 2px' }} />
          <ToolBtn
            onClick={() => {
              if (bubble.hasLink) {
                editor.chain().focus().unsetLink().run()
                setBubble(null)
              } else {
                const selectedText = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to).trim()
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
            active={bubble.hasLink} title={bubble.hasLink ? 'Remove link' : 'Make hyperlink'} theme={theme}>
            {bubble.hasLink ? <Link2Off size={13} /> : <Link2 size={13} />}
          </ToolBtn>
          <span style={{ fontSize: '11px', color: bubble.hasLink ? '#ef4444' : theme.textMuted, paddingRight: '2px' }}>
            {bubble.hasLink ? 'Remove' : 'Link'}
          </span>
        </div>
      )}

      {/* Slash command menu */}
      {slashMenu && filteredSlash.length > 0 && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'fixed', left: slashMenu.x, top: slashMenu.y,
            background: toolbarBg, border: `1px solid ${borderColor}`,
            borderRadius: '10px', padding: '4px', zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: '220px',
          }}
        >
          <p style={{ fontSize: '10px', color: theme.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px 2px', margin: 0 }}>Insert block</p>
          {filteredSlash.map((cmd, i) => (
            <div
              key={cmd.label}
              onMouseDown={e => { e.preventDefault(); runSlashCommand(cmd) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '7px 10px', borderRadius: '7px', cursor: 'pointer',
                background: i === slashIndex ? theme.accentBg : 'transparent',
              }}
              onMouseEnter={() => setSlashIndex(i)}
            >
              <span style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: theme.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', color: theme.accent, fontWeight: '700', flexShrink: 0,
              }}>{cmd.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '500', color: theme.text }}>{cmd.label}</p>
                <p style={{ margin: 0, fontSize: '11px', color: theme.textFaint }}>{cmd.description}</p>
              </div>
            </div>
          ))}
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

          {/* Hover sidenote button */}
          {hoveredPara !== null && (() => {
            const existing = sidenotes.find(s => s.paragraph_index === hoveredPara)
            if (existing) return null
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
        <div style={{ width: '180px', flexShrink: 0, position: 'relative' }}>
          {sidenotes.map(s => (
            <div key={s.id} style={{ position: 'absolute', top: getParaTop(s.paragraph_index), left: '8px', right: '4px' }}>
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
                    <SidenoteMarkup content={s.content} theme={theme} />
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

// Renders sidenote content with **bold** and - bullets
function SidenoteMarkup({ content, theme }) {
  const lines = content.split('\n')
  return (
    <div style={{ flex: 1 }}>
      {lines.map((line, i) => {
        const isBullet = line.trimStart().startsWith('- ')
        const text = isBullet ? line.trimStart().slice(2) : line

        // Parse **bold** inline
        const parts = text.split(/(\*\*[^*]+\*\*)/)
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} style={{ color: theme.text, fontWeight: '700' }}>{part.slice(2, -2)}</strong>
          }
          return part
        })

        if (isBullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
              <span style={{ color: theme.accent, flexShrink: 0 }}>•</span>
              <span>{rendered}</span>
            </div>
          )
        }
        return <div key={i} style={{ marginBottom: i < lines.length - 1 ? '2px' : 0 }}>{rendered}</div>
      })}
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
        placeholder={'Add a sidenote...\n**bold**, - bullet'}
        rows={3}
        style={{
          width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
          fontSize: '11px', color: theme.text, lineHeight: 1.5, boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        <button onClick={() => onSave(val)} style={{ fontSize: '10px', padding: '2px 8px', background: theme.accent, border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}>Save</button>
        {onDelete && <button onClick={onDelete} style={{ fontSize: '10px', padding: '2px 8px', background: 'none', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', cursor: 'pointer' }}>Delete</button>}
        <button onClick={onCancel} style={{ fontSize: '10px', padding: '2px 8px', background: 'none', border: `1px solid ${borderColor}`, borderRadius: '4px', color: theme.textMuted, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}

function ToolBtn({ onClick, active, children, title, theme }) {
  const isDark = theme?.dark !== false
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? (theme?.accentBg || 'rgba(192,132,252,0.15)') : 'transparent',
        border: 'none', borderRadius: '5px', padding: '5px 6px',
        color: active ? (theme?.accent || '#c084fc') : (isDark ? '#9ca3af' : '#555570'),
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
.tiptap mark { border-radius: 3px; padding: 0 2px; }
`
}
