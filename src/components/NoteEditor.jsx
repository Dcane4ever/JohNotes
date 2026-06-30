import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { supabase } from '../lib/supabase'
import { Bold, Italic, List, ListOrdered, Heading2, Strikethrough, CheckSquare } from 'lucide-react'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'

const SAVE_DELAY = 1000

export default function NoteEditor({ note, onSave, theme = 'dark' }) {
  const isDark = theme === 'dark'
  const toolbarBg = isDark ? '#16161e' : '#e4e4ef'
  const borderColor = isDark ? '#2a2a35' : '#c8c8d8'
  const titleColor = isDark ? '#e2e2e7' : '#1a1a2e'
  const editorTextColor = isDark ? '#d1d5db' : '#2d2d3d'
  const editorHeadingColor = isDark ? '#e2e2e7' : '#1a1a2e'
  const placeholderColor = isDark ? '#4b5563' : '#a0a0b8'
  const markerColor = isDark ? '#9ca3af' : '#6b7280'
  const dividerColor = isDark ? '#2a2a35' : '#c8c8d8'

  const [title, setTitle] = useState(note.title || '')
  const [saveStatus, setSaveStatus] = useState('saved')
  const saveTimer = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: note.content || {},
    onUpdate: () => {
      setSaveStatus('unsaved')
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(saveContent, SAVE_DELAY)
    },
  })

  useEffect(() => () => clearTimeout(saveTimer.current), [])

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
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: saveStatus === 'saved' ? (isDark ? '#4b5563' : '#9ca3af') : '#facc15' }}>
          {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
        </span>
      </div>

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

      {/* Editor */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
        <style>{getEditorCSS(editorTextColor, editorHeadingColor, placeholderColor, markerColor)}</style>
        <EditorContent editor={editor} />
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
`
}
