import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!
const SENDER_EMAIL = 'amenotesnijoh@gmail.com'
const SENDER_NAME = 'Amenō'

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Get recipient email from settings
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'notify_email')
    .single()

  const recipientEmail = setting?.value?.trim()
  if (!recipientEmail) {
    return new Response(JSON.stringify({ message: 'No notify_email set' }), { status: 200 })
  }

  // Find events starting in the next 60 minutes that haven't been notified
  const now = new Date()
  const in60 = new Date(now.getTime() + 60 * 60 * 1000)

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('push_enabled', true)
    .gte('start_time', now.toISOString())
    .lte('start_time', in60.toISOString())

  if (!events || events.length === 0) {
    return new Response(JSON.stringify({ message: 'No upcoming events' }), { status: 200 })
  }

  const results = []

  for (const event of events) {
    const eventTime = new Date(event.start_time).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    })

    const html = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1e2030; color: #c8d3f5; border-radius: 12px;">
        <h2 style="font-size: 22px; color: #e06c75; margin-bottom: 8px;">⏰ Upcoming Reminder</h2>
        <h3 style="font-size: 18px; color: #c8d3f5; margin-bottom: 4px;">${event.title}</h3>
        <p style="font-size: 14px; color: #828bb8;">Today at ${eventTime}</p>
        ${event.notes ? `<p style="font-size: 13px; color: #828bb8; margin-top: 12px; border-left: 3px solid #e06c75; padding-left: 12px;">${event.notes}</p>` : ''}
        <p style="font-size: 11px; color: #444874; margin-top: 24px;">Sent by Amenō</p>
      </div>
    `

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: recipientEmail }],
        subject: `⏰ Reminder: ${event.title} at ${eventTime}`,
        htmlContent: html,
      }),
    })

    results.push({ event: event.title, status: res.status })
  }

  return new Response(JSON.stringify({ sent: results }), { status: 200 })
})
