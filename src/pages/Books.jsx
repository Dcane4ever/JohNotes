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

export default function Books() {
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

  const genres = ['all', ...new Set(books.map(b => b.genre).filter(Boolean).map(g => g.trim()).filter(g => g !== ''))]

  const filtered = books.filter(b => {
    const matchStatus = filter === 'all' || b.status === filter
    const matchGenre = genreFilter === 'all' || (b.genre || '').toLowerCase() === genreFilter.toLowerCase()
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#e2e2e7' }}>Book Tracker</h1>
        <button onClick={openAdd} style={primaryBtn}>
          <Plus size={15} /> Add Book
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '16px 28px 0', display: 'flex', gap: '8px', flexShrink: 0 }}>
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              background: filter === s.key ? '#7c3aed' : '#1e1e2a',
              color: filter === s.key ? 'white' : '#9ca3af',
              transition: 'all 0.15s',
            }}
          >
            {s.label} {s.key !== 'all' && `(${books.filter(b => b.status === s.key).length})`}
          </button>
        ))}
      </div>

      {/* Genre tabs — auto-generated from book genres */}
      {genres.length > 1 && (
        <div style={{ padding: '10px 28px 0', display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
          {genres.map(g => (
            <button
              key={g}
              onClick={() => setGenreFilter(g)}
              style={{
                padding: '4px 12px', borderRadius: '20px', border: '1px solid',
                cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'all 0.15s',
                background: genreFilter === g ? 'rgba(192,132,252,0.15)' : 'transparent',
                borderColor: genreFilter === g ? '#c084fc' : '#2a2a35',
                color: genreFilter === g ? '#c084fc' : '#6b7280',
              }}
            >
              {g === 'all' ? 'All genres' : g}
            </button>
          ))}
        </div>
      )}

      {/* Book grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', flexDirection: 'column', gap: '12px', color: '#4b5563' }}>
            <BookOpen size={40} />
            <p style={{ fontSize: '14px' }}>No books yet. Add one!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
            {filtered.map(book => (
              <BookCard key={book.id} book={book} onClick={() => openEdit(book)} onDelete={deleteBook} />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <BookModal
          book={editBook}
          onClose={() => setShowModal(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

function BookCard({ book, onClick, onDelete }) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', position: 'relative', group: true }}>
      {/* Cover */}
      <div style={{
        width: '100%', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden',
        background: '#1e1e2a', border: '1px solid #2a2a35', marginBottom: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <BookOpen size={32} style={{ color: '#4b5563' }} />
        )}
        {/* Status badge */}
        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          background: STATUS_COLORS[book.status] || '#6b7280',
          borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: '600', color: '#0f0f13',
        }}>
          {book.status === 'want_to_read' ? 'WANT' : book.status === 'reading' ? 'READING' : 'DONE'}
        </div>
        {/* Delete */}
        <button
          onClick={(e) => onDelete(book.id, e)}
          style={{
            position: 'absolute', top: '8px', right: '8px',
            background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px',
            padding: '3px', color: '#ef4444', cursor: 'pointer', display: 'flex',
          }}
        >
          <X size={12} />
        </button>
      </div>
      <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e2e7', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.author}</p>
      {book.rating > 0 && (
        <div style={{ display: 'flex', gap: '2px' }}>
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={11} fill={i <= book.rating ? '#facc15' : 'none'} stroke={i <= book.rating ? '#facc15' : '#4b5563'} />
          ))}
        </div>
      )}
      {book.status === 'reading' && book.total_pages > 0 && (
        <div style={{ marginTop: '4px' }}>
          <div style={{ height: '3px', background: '#2a2a35', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (book.current_page / book.total_pages) * 100)}%`, background: '#38bdf8', borderRadius: '2px' }} />
          </div>
          <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{book.current_page}/{book.total_pages} pages</p>
        </div>
      )}
    </div>
  )
}

function BookModal({ book, onClose, onSaved }) {
  const isEdit = !!book
  const [form, setForm] = useState({
    title: book?.title || '',
    author: book?.author || '',
    genre: book?.genre || '',
    status: book?.status || 'want_to_read',
    rating: book?.rating || 0,
    review: book?.review || '',
    current_page: book?.current_page || 0,
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
    const payload = {
      ...form,
      current_page: Number(form.current_page) || 0,
      total_pages: Number(form.total_pages) || 0,
      rating: Number(form.rating) || 0,
    }
    if (isEdit) {
      const { data } = await supabase.from('books').update(payload).eq('id', book.id).select().single()
      if (data) onSaved(data, false)
    } else {
      const { data } = await supabase.from('books').insert(payload).select().single()
      if (data) onSaved(data, true)
    }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#16161e', border: '1px solid #2a2a35', borderRadius: '12px', width: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e2e7' }}>{isEdit ? 'Edit Book' : 'Add Book'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Cover upload */}
          <div style={{ flexShrink: 0 }}>
            <label style={{ cursor: 'pointer' }}>
              <div style={{
                width: '110px', height: '165px', borderRadius: '8px', border: '2px dashed #2a2a35',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '8px', color: '#4b5563', overflow: 'hidden', background: '#12121a',
              }}>
                {form.cover_url ? (
                  <img src={form.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : uploading ? (
                  <p style={{ fontSize: '11px' }}>Uploading...</p>
                ) : (
                  <>
                    <Upload size={20} />
                    <p style={{ fontSize: '11px', textAlign: 'center' }}>Upload cover</p>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" onChange={uploadCover} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Fields */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Field label="Title *" value={form.title} onChange={v => set('title', v)} placeholder="Book title" />
            <Field label="Author" value={form.author} onChange={v => set('author', v)} placeholder="Author name" />
            <Field label="Genre" value={form.genre} onChange={v => set('genre', v)} placeholder="e.g. Fiction, Science" />

            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {STATUSES.filter(s => s.key !== 'all').map(s => (
                  <button key={s.key} onClick={() => set('status', s.key)} style={{
                    flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500',
                    background: form.status === s.key ? '#7c3aed' : '#1e1e2a',
                    color: form.status === s.key ? 'white' : '#9ca3af',
                  }}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Star rating */}
            <div>
              <label style={labelStyle}>Rating</label>
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i} size={22} style={{ cursor: 'pointer' }}
                    fill={(hoverStar || form.rating) >= i ? '#facc15' : 'none'}
                    stroke={(hoverStar || form.rating) >= i ? '#facc15' : '#4b5563'}
                    onMouseEnter={() => setHoverStar(i)}
                    onMouseLeave={() => setHoverStar(0)}
                    onClick={() => set('rating', i === form.rating ? 0 : i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress (only if reading) */}
        {form.status === 'reading' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Field label="Current page" value={form.current_page} onChange={v => set('current_page', v)} type="number" />
            <Field label="Total pages" value={form.total_pages} onChange={v => set('total_pages', v)} type="number" />
          </div>
        )}

        {/* Review */}
        <div style={{ marginTop: '16px' }}>
          <label style={labelStyle}>Review / Notes</label>
          <textarea
            value={form.review}
            onChange={e => set('review', e.target.value)}
            placeholder="Your thoughts on this book..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', marginTop: '6px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={save} disabled={saving} style={{ ...primaryBtn, flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Book'}
          </button>
          <button onClick={onClose} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, marginTop: '6px' }}
      />
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
