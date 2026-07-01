import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Save, Check } from 'lucide-react'

export default function Settings({ theme = {} }) {
  const bg = theme.surface1 || '#12121a'
  const border = theme.border || '#2a2a35'
  const text = theme.text || '#e2e2e7'
  const muted = theme.textMuted || '#9ca3af'
  const faint = theme.textFaint || '#4b5563'
  const accent = theme.accent || '#c084fc'
  const surface2 = theme.surface2 || '#16161e'

  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'notify_email').single()
      if (data) setEmail(data.value || '')
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    await supabase.from('settings').upsert({ key: 'notify_email', value: email.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: '560px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: text, marginBottom: '6px' }}>Settings</h1>
      <p style={{ fontSize: '13px', color: muted, marginBottom: '32px' }}>App preferences and notifications</p>

      {/* Email reminder section */}
      <div style={{ background: surface2, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Mail size={16} style={{ color: accent }} />
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: text }}>Email Reminders</h2>
        </div>
        <p style={{ fontSize: '12px', color: faint, marginBottom: '16px' }}>
          Get an email 1 hour before events that have reminders enabled. Make sure "Notify me" is toggled on the event.
        </p>

        <label style={{ fontSize: '11px', fontWeight: '600', color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Reminder email address
        </label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input
            type="email"
            value={loading ? '' : email}
            onChange={e => setEmail(e.target.value)}
            placeholder="her@email.com"
            onKeyDown={e => e.key === 'Enter' && save()}
            style={{
              flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: '8px',
              padding: '9px 12px', color: text, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <button
            onClick={save}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: saved ? '#16a34a' : accent, border: 'none', borderRadius: '8px',
              padding: '9px 16px', color: 'white', fontSize: '13px', cursor: 'pointer',
              fontWeight: '500', transition: 'background 0.2s', whiteSpace: 'nowrap',
            }}
          >
            {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save</>}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: faint, marginTop: '10px' }}>
          Emails sent from Amenō once per hour for events starting within the next 60 minutes.
        </p>
      </div>
    </div>
  )
}
