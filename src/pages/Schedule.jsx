import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, ChevronLeft, ChevronRight, Bell, BellOff, Clock } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const RECURRENCE_OPTIONS = [
  { key: 'none', label: 'No repeat' },
  { key: 'daily', label: 'Every day' },
  { key: 'weekly', label: 'Every week' },
  { key: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { key: 'custom', label: 'Custom days' },
]
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const EVENT_COLORS = ['#c084fc','#f472b6','#fb923c','#facc15','#4ade80','#38bdf8','#818cf8','#f87171']

export default function Schedule() {
  const [events, setEvents] = useState([])
  const [today] = useState(new Date())
  const [current, setCurrent] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [notifPermission, setNotifPermission] = useState('default')
  const [dayDetail, setDayDetail] = useState(null) // { day, events }

  useEffect(() => {
    fetchEvents()
    if ('Notification' in window) setNotifPermission(Notification.permission)
  }, [])

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('*').order('start_time')
    if (data) setEvents(data)
  }

  async function requestNotifPermission() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  function onSaved(event, isNew) {
    setEvents(prev => isNew ? [...prev, event] : prev.map(e => e.id === event.id ? event : e))
    setShowModal(false)
  }

  async function deleteEvent(id) {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    setShowModal(false)
  }

  function openDay(day) {
    const dayEvents = getEventsForDay(day)
    setDayDetail({ day, events: dayEvents })
  }

  function openAdd(date) {
    setEditEvent(null)
    setSelectedDate(date)
    setDayDetail(null)
    setShowModal(true)
  }

  function openEdit(event, e) {
    e.stopPropagation()
    setEditEvent(event)
    setSelectedDate(null)
    setDayDetail(null)
    setShowModal(true)
  }

  // Calendar grid
  const year = current.getFullYear()
  const month = current.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function getEventsForDay(day) {
    if (!day) return []
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return events.filter(ev => {
      const evDate = ev.start_time ? ev.start_time.slice(0, 10) : null
      if (evDate === dateStr) return true
      if (!ev.recurrence_rule || ev.recurrence_rule === 'none') return false
      const evDay = ev.start_time ? new Date(ev.start_time).getDay() : null
      const cellDay = new Date(year, month, day).getDay()
      if (ev.recurrence_rule === 'daily') return true
      if (ev.recurrence_rule === 'weekly') return evDay === cellDay
      if (ev.recurrence_rule === 'weekdays') return cellDay >= 1 && cellDay <= 5
      if (ev.recurrence_rule?.startsWith('custom:')) {
        const days = ev.recurrence_rule.replace('custom:', '').split(',').map(Number)
        return days.includes(cellDay)
      }
      return false
    })
  }

  const isToday = (day) => day && today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#e2e2e7' }}>Schedule</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button onClick={() => setCurrent(new Date(year, month - 1))} style={iconBtn}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#c084fc', minWidth: '160px', textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </span>
            <button onClick={() => setCurrent(new Date(year, month + 1))} style={iconBtn}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={requestNotifPermission} style={{ ...iconBtn, gap: '6px', padding: '6px 12px', fontSize: '12px', color: notifPermission === 'granted' ? '#4ade80' : '#9ca3af' }}>
            {notifPermission === 'granted' ? <Bell size={14} /> : <BellOff size={14} />}
            {notifPermission === 'granted' ? 'Notifications on' : 'Enable notifications'}
          </button>
          <button onClick={() => openAdd(null)} style={primaryBtn}>
            <Plus size={15} /> Add Event
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ padding: '16px 28px 0', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', flexShrink: 0 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#4b5563', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, padding: '4px 28px 20px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', gap: '4px', overflow: 'hidden' }}>
        {cells.map((day, i) => {
          const dayEvents = getEventsForDay(day)
          return (
            <div
              key={i}
              onClick={() => day && openDay(day)}
              style={{
                background: isToday(day) ? 'rgba(192,132,252,0.08)' : day ? '#12121a' : 'transparent',
                border: isToday(day) ? '1px solid #c084fc' : '1px solid #1e1e2a',
                borderRadius: '8px', padding: '6px', cursor: day ? 'pointer' : 'default',
                overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '2px',
              }}
            >
              {day && (
                <>
                  <span style={{ fontSize: '12px', fontWeight: isToday(day) ? '700' : '400', color: isToday(day) ? '#c084fc' : '#6b7280', alignSelf: 'flex-end' }}>{day}</span>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      style={{
                        background: ev.color || '#7c3aed', borderRadius: '3px',
                        padding: '1px 4px', fontSize: '10px', color: 'white',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {ev.start_time ? new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' : ''}{ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span style={{ fontSize: '9px', color: '#c084fc', fontWeight: '600' }}>
                      +{dayEvents.length - 3} more
                    </span>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Day detail modal */}
      {dayDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setDayDetail(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#16161e', border: '1px solid #2a2a35', borderRadius: '12px', width: '360px', maxHeight: '80vh', overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#e2e2e7' }}>
                {MONTHS[month]} {dayDetail.day}, {year}
              </h3>
              <button onClick={() => setDayDetail(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {dayDetail.events.length === 0 && (
                <p style={{ fontSize: '13px', color: '#4b5563', textAlign: 'center', padding: '20px 0' }}>No events this day</p>
              )}
              {dayDetail.events.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => openEdit(ev, { stopPropagation: () => {} })}
                  style={{
                    background: ev.color || '#7c3aed', borderRadius: '8px',
                    padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{ev.title}</span>
                  {ev.start_time && (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                      {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {ev.notes && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{ev.notes}</span>}
                </div>
              ))}
            </div>
            <button
              onClick={() => openAdd(new Date(year, month, dayDetail.day))}
              style={{ ...primaryBtn, width: '100%', justifyContent: 'center', marginTop: '14px' }}
            >
              <Plus size={14} /> Add Event
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <EventModal
          event={editEvent}
          defaultDate={selectedDate}
          onClose={() => setShowModal(false)}
          onSaved={onSaved}
          onDelete={deleteEvent}
          notifPermission={notifPermission}
        />
      )}
    </div>
  )
}

function EventModal({ event, defaultDate, onClose, onSaved, onDelete, notifPermission }) {
  const isEdit = !!event
  const defaultDateStr = defaultDate ? `${defaultDate.getFullYear()}-${String(defaultDate.getMonth()+1).padStart(2,'0')}-${String(defaultDate.getDate()).padStart(2,'0')}` : ''
  const defaultTimeStr = event?.start_time ? new Date(event.start_time).toTimeString().slice(0,5) : '09:00'
  const defaultEventDateStr = event?.start_time ? event.start_time.slice(0,10) : defaultDateStr

  const [form, setForm] = useState({
    title: event?.title || '',
    date: defaultEventDateStr,
    time: defaultTimeStr,
    recurrence_rule: event?.recurrence_rule || 'none',
    custom_days: event?.recurrence_rule?.startsWith('custom:') ? event.recurrence_rule.replace('custom:','').split(',').map(Number) : [],
    push_enabled: event?.push_enabled || false,
    color: event?.color || EVENT_COLORS[0],
    notes: event?.notes || '',
  })
  const [saving, setSaving] = useState(false)

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  function toggleCustomDay(d) {
    setForm(prev => ({
      ...prev,
      custom_days: prev.custom_days.includes(d) ? prev.custom_days.filter(x => x !== d) : [...prev.custom_days, d]
    }))
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    const start_time = form.date ? new Date(`${form.date}T${form.time || '09:00'}`).toISOString() : null
    const recurrence_rule = form.recurrence_rule === 'custom'
      ? `custom:${form.custom_days.sort().join(',')}`
      : form.recurrence_rule

    const payload = { title: form.title, start_time, recurrence_rule, push_enabled: form.push_enabled, color: form.color, notes: form.notes }

    if (form.push_enabled && notifPermission === 'granted' && start_time) {
      scheduleNotification(form.title, new Date(start_time))
    }

    if (isEdit) {
      const { data } = await supabase.from('events').update(payload).eq('id', event.id).select().single()
      if (data) onSaved(data, false)
    } else {
      const { data } = await supabase.from('events').insert(payload).select().single()
      if (data) onSaved(data, true)
    }
    setSaving(false)
  }

  function scheduleNotification(title, date) {
    const delay = date.getTime() - Date.now()
    if (delay > 0) {
      setTimeout(() => {
        new Notification('JohNotes Reminder', {
          body: title,
          icon: '/JohNotes/favicon.svg',
        })
      }, delay)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#16161e', border: '1px solid #2a2a35', borderRadius: '12px', width: '460px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#e2e2e7' }}>{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Event title" style={{ ...inputStyle, marginTop: '6px' }} />
          </div>

          {/* Date + Time */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ ...inputStyle, marginTop: '6px', colorScheme: 'dark' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Time</label>
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <Clock size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                <input type="time" value={form.time} onChange={e => set('time', e.target.value)} style={{ ...inputStyle, paddingLeft: '28px', colorScheme: 'dark' }} />
              </div>
            </div>
          </div>

          {/* Recurrence */}
          <div>
            <label style={labelStyle}>Repeat</label>
            <select value={form.recurrence_rule} onChange={e => set('recurrence_rule', e.target.value)} style={{ ...inputStyle, marginTop: '6px' }}>
              {RECURRENCE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>

          {/* Custom days */}
          {form.recurrence_rule === 'custom' && (
            <div>
              <label style={labelStyle}>Days</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {DAY_NAMES.map((d, i) => (
                  <button key={i} onClick={() => toggleCustomDay(i)} style={{
                    flex: 1, padding: '6px 0', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600',
                    background: form.custom_days.includes(i) ? '#7c3aed' : '#1e1e2a',
                    color: form.custom_days.includes(i) ? 'white' : '#9ca3af',
                  }}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              {EVENT_COLORS.map(c => (
                <div key={c} onClick={() => set('color', c)} style={{
                  width: '22px', height: '22px', borderRadius: '50%', background: c, cursor: 'pointer',
                  outline: form.color === c ? '2px solid white' : 'none', outlineOffset: '2px',
                }} />
              ))}
            </div>
          </div>

          {/* Push notification */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#12121a', borderRadius: '8px', border: '1px solid #2a2a35' }}>
            <Bell size={15} style={{ color: form.push_enabled ? '#c084fc' : '#4b5563' }} />
            <span style={{ flex: 1, fontSize: '13px', color: '#9ca3af' }}>Notify me at this time</span>
            <div
              onClick={() => set('push_enabled', !form.push_enabled)}
              style={{
                width: '36px', height: '20px', borderRadius: '10px', cursor: 'pointer',
                background: form.push_enabled ? '#7c3aed' : '#2a2a35', position: 'relative', transition: 'all 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '3px', left: form.push_enabled ? '19px' : '3px',
                width: '14px', height: '14px', borderRadius: '50%', background: 'white', transition: 'all 0.2s',
              }} />
            </div>
          </div>
          {form.push_enabled && notifPermission !== 'granted' && (
            <p style={{ fontSize: '11px', color: '#fb923c', marginTop: '-8px' }}>Enable notifications first using the button in the header.</p>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." rows={2} style={{ ...inputStyle, resize: 'vertical', marginTop: '6px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <button onClick={save} disabled={saving} style={{ ...primaryBtn, flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Event'}
          </button>
          {isEdit && (
            <button onClick={() => onDelete(event.id)} style={{ ...ghostBtn, color: '#ef4444', borderColor: '#ef4444' }}>Delete</button>
          )}
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
        </div>
      </div>
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
const iconBtn = {
  background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
  padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px',
}
