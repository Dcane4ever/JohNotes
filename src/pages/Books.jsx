import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Star, X, Upload, BookOpen, Bookmark, CheckCircle } from 'lucide-react'

const STATUSES = [
  { key: 'all', label: 'All' },
  { key: 'want_to_read', label: 'Want to Read', icon: Bookmark },
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'finished', label: 'Finished', icon: CheckCircle },
]

const STATUS_COLORS = {
  want_to_read: '#6b7280',
  reading: '#38bdf8',
  finished: '#4ade80',
}

export default function Books({ theme = {} }) {
  const t = theme
  const [books, setBooks] = useState([])
  const [filter, setFilter] = useState('all')
  const [genreFilter, setGenreFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editBook, setEditBook] = useState(null)

  useEffect(() => { fetchBooks() }, [])

  async function fetchBooks() {
    const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false })
    if (data) setBooks(data)
  }

  const genres = ['all', ...new Set(books.flatMap(b =>
    (b.genre || '').split(',').map(g => g.trim()).filter(g => g !== '')
  ))]

  const filtered = books.filter(b => {
    const matchStatus = filter === 'all' || b.status === filter
    const bookGenres = (b.genre || '').split(',').map(g => g.trim().toLowerCase())
    const matchGenre = genreFilter === 'all' || bookGenres.includes(genreFilter.toLowerCase())
    return matchStatus && matchGenre
  })

  function openAdd() { setEditBook(null); setShowModal(true) }
  function openEdit(book) { setEditBook(book); setShowModal(true) }

  function onSaved(book, isNew) {
    if (isNew) setBooks(prev => [book, ...prev])
    else setBooks(prev => prev.map(b => b.id === book.id ? book : b))
    setShowModal(false)
  }

  async function deleteBook(id, e) {
    e.stopPropagation()
    await supabase.from('books').delete().eq('id', id)
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  async function updateCurrentPage(id, current_page, e) {
    e.stopPropagation()
    const { data } = await supabase.from('books').update({ current_page }).eq('id', id).select().single()
    if (data) setBooks(prev => prev.map(b => b.id === id ? data : b))
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: t.text }}>Book Tracker</h1>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: t.accentBtn, border: 'none', borderRadius: '8px', padding: '8px 16px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
          <Plus size={15} /> Add Book
        </button>
      </div>

      {/* Status filter */}
      <div style={{ padding: '16px 28px 0', display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)} style={{
            padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: '500', transition: 'all 0.15s',
            background: filter === s.key ? t.accentBtn : t.surface3,
            color: filter === s.key ? 'white' : t.textMuted,
          }}>
            {s.label} {s.key !== 'all' && `(${books.filter(b => b.status === s.key).length})`}
          </button>
        ))}
      </div>

      {/* Genre chip filter */}
      {genres.length > 1 && (
        <div style={{ padding: '10px 28px 0', display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
          {genres.map(g => (
            <button key={g} onClick={() => setGenreFilter(g)} style={{
              padding: '4px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer',
              fontSize: '12px', fontWeight: '500', transition: 'all 0.15s',
              background: genreFilter === g ? t.accentBg : 'transparent',
              borderColor: genreFilter === g ? t.accent : t.border,
              color: genreFilter === g ? t.accent : t.textMuted,
            }}>
              {g === 'all' ? 'All genres' : g}
            </button>
          ))}
        </div>
      )}

      {/* Book grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', gap: '12px', color: t.textFaint }}>
            <BookOpen size={40} />
            <p style={{ fontSize: '14px' }}>No books yet. Add one!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
            {filtered.map(book => (
              <BookCard key={book.id} book={book} theme={t} onClick={() => openEdit(book)} onDelete={deleteBook} onUpdatePage={updateCurrentPage} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <BookModal book={editBook} theme={t} onClose={() => setShowModal(false)} onSaved={onSaved} />
      )}
    </div>
  )
}

function BookCard({ book, theme: t, onClick, onDelete, onUpdatePage }) {
  const [editingPage, setEditingPage] = useState(false)
  const [pageVal, setPageVal] = useState(book.current_page || 0)
  const pct = book.total_pages > 0 ? Math.min(100, ((book.current_page || 0) / book.total_pages) * 100) : 0

  return (
    <div onClick={onClick} style={{ cursor: 'pointer', position: 'relative' }}>
      <div style={{
        width: '100%', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden',
        background: t.surface3, border: `1px solid ${t.border}`, marginBottom: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <BookOpen size={32} style={{ color: t.textFaint }} />}
        <div style={{ position: 'absolute', top: '8px', left: '8px', background: STATUS_COLORS[book.status] || '#6b7280', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: '600', color: '#0f0f13' }}>
          {book.status === 'want_to_read' ? 'WANT' : book.status === 'reading' ? 'READING' : 'DONE'}
        </div>
        <button onClick={e => onDelete(book.id, e)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', padding: '3px', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
          <X size={12} />
        </button>
      </div>

      <p style={{ fontSize: '13px', fontWeight: '600', color: t.text, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
      <p style={{ fontSize: '12px', color: t.textMuted, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>

      {/* Genre chips */}
      {book.genre && (
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '4px' }}>
          {book.genre.split(',').map(g => g.trim()).filter(Boolean).map(g => (
            <span key={g} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '10px', background: t.accentBg, color: t.accent, border: `1px solid ${t.border}` }}>{g}</span>
          ))}
        </div>
      )}

      {book.rating > 0 && (
        <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={11} fill={i <= book.rating ? '#facc15' : 'none'} stroke={i <= book.rating ? '#facc15' : t.textFaint} />
          ))}
        </div>
      )}

      {/* Reading progress — click to update page */}
      {book.status === 'reading' && book.total_pages > 0 && (
        <div style={{ marginTop: '2px' }} onClick={e => e.stopPropagation()}>
          <div style={{ height: '3px', background: t.border, borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#38bdf8', borderRadius: '2px' }} />
          </div>
          {editingPage ? (
            <input
              autoFocus
              type="number"
              value={pageVal}
              onChange={e => setPageVal(e.target.value)}
              onBlur={e => { onUpdatePage(book.id, Number(pageVal), e); setEditingPage(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { onUpdatePage(book.id, Number(pageVal), e); setEditingPage(false) } if (e.key === 'Escape') setEditingPage(false) }}
              style={{ width: '60px', fontSize: '10px', background: t.surface1, border: `1px solid ${t.border}`, borderRadius: '4px', padding: '1px 4px', color: t.text, outline: 'none' }}
            />
          ) : (
            <p onClick={() => setEditingPage(true)} style={{ fontSize: '10px', color: t.textMuted, cursor: 'text', margin: 0 }} title="Click to update page">
              {book.current_page || 0}/{book.total_pages} pages
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Chip input for genre
function GenreChipInput({ value, onChange, theme: t }) {
  const chips = value ? value.split(',').map(g => g.trim()).filter(Boolean) : []
  const [input, setInput] = useState('')

  function addChip(val) {
    const trimmed = val.trim()
    if (!trimmed || chips.includes(trimmed)) { setInput(''); return }
    onChange([...chips, trimmed].join(', '))
    setInput('')
  }

  function removeChip(chip) {
    onChange(chips.filter(c => c !== chip).join(', '))
  }

  return (
    <div style={{ border: `1px solid ${t.border}`, borderRadius: '6px', background: t.surface1, padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
      {chips.map(chip => (
        <span key={chip} style={{ display: 'flex', alignItems: 'center', gap: '3px', background: t.accentBg, border: `1px solid ${t.accent}40`, borderRadius: '12px', padding: '2px 8px', fontSize: '12px', color: t.accent }}>
          {chip}
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
        placeholder={chips.length ? '' : 'Add genre, press Enter'}
        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: t.text, minWidth: '80px', flex: 1 }}
      />
    </div>
  )
}

function BookModal({ book, theme: t, onClose, onSaved }) {
  const isEdit = !!book
  const [form, setForm] = useState({
    title: book?.title || '',
    author: book?.author || '',
    genre: book?.genre || '',
    status: book?.status || 'want_to_read',
    rating: book?.rating || 0,
    review: book?.review || '',
    total_pages: book?.total_pages || 0,
    cover_url: book?.cover_url || '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hoverStar, setHoverStar] = useState(0)

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  async function uploadCover(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `covers/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('covers').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      set('cover_url', data.publicUrl)
    }
    setUploading(false)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { ...form, total_pages: Number(form.total_pages) || 0, rating: Number(form.rating) || 0 }
    if (isEdit) {
      const { data } = await supabase.from('books').update(payload).eq('id', book.id).select().single()
      if (data) onSaved(data, false)
    } else {
      const { data } = await supabase.from('books').insert(payload).select().single()
      if (data) onSaved(data, true)
    }
    setSaving(false)
  }

  const mInput = { width: '100%', background: t.surface1, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '8px 10px', color: t.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const mLabel = { fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: '12px', width: 'min(520px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: t.text }}>{isEdit ? 'Edit Book' : 'Add Book'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Cover upload */}
          <div style={{ flexShrink: 0 }}>
            <label style={{ cursor: 'pointer' }}>
              <div style={{ width: '110px', height: '165px', borderRadius: '8px', border: `2px dashed ${t.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: t.textFaint, overflow: 'hidden', background: t.surface1 }}>
                {form.cover_url ? <img src={form.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : uploading ? <p style={{ fontSize: '11px' }}>Uploading...</p>
                  : <><Upload size={20} /><p style={{ fontSize: '11px', textAlign: 'center' }}>Upload cover</p></>}
              </div>
              <input type="file" accept="image/*" onChange={uploadCover} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Fields */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><label style={mLabel}>Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Book title" style={{ ...mInput, marginTop: '6px' }} /></div>
            <div><label style={mLabel}>Author</label><input value={form.author} onChange={e => set('author', e.target.value)} placeholder="Author name" style={{ ...mInput, marginTop: '6px' }} /></div>

            {/* Genre chip input */}
            <div>
              <label style={mLabel}>Genre</label>
              <div style={{ marginTop: '6px' }}>
                <GenreChipInput value={form.genre} onChange={v => set('genre', v)} theme={t} />
              </div>
            </div>

            {/* Status */}
            <div>
              <label style={mLabel}>Status</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {STATUSES.filter(s => s.key !== 'all').map(s => (
                  <button key={s.key} onClick={() => set('status', s.key)} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', background: form.status === s.key ? t.accentBtn : t.surface3, color: form.status === s.key ? 'white' : t.textMuted }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Star rating */}
            <div>
              <label style={mLabel}>Rating</label>
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={22} style={{ cursor: 'pointer' }}
                    fill={(hoverStar || form.rating) >= i ? '#facc15' : 'none'}
                    stroke={(hoverStar || form.rating) >= i ? '#facc15' : t.textFaint}
                    onMouseEnter={() => setHoverStar(i)} onMouseLeave={() => setHoverStar(0)}
                    onClick={() => set('rating', i === form.rating ? 0 : i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Total pages only */}
        <div style={{ marginTop: '16px' }}>
          <label style={mLabel}>Total Pages</label>
          <input type="number" value={form.total_pages} onChange={e => set('total_pages', e.target.value)} placeholder="0" style={{ ...mInput, marginTop: '6px', width: '120px' }} />
        </div>

        {/* Review */}
        <div style={{ marginTop: '16px' }}>
          <label style={mLabel}>Review / Notes</label>
          <textarea value={form.review} onChange={e => set('review', e.target.value)} placeholder="Your thoughts on this book..." rows={3} style={{ ...mInput, resize: 'vertical', marginTop: '6px' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: t.accentBtn, border: 'none', borderRadius: '8px', padding: '8px 16px', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '500', flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Book'}
          </button>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '8px 16px', color: t.textMuted, fontSize: '13px', cursor: 'pointer', flex: 1 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
