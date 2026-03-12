import { getSupabase, cors } from '../lib/supabaseServer.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const supabase = getSupabase()

    if (req.method === 'GET') {
      const userEmail = (req.headers['x-user-email'] || '').trim().toLowerCase()
      let includeEmails = false
      if (userEmail) {
        const { data: settingsRows } = await supabase.from('app_settings').select('key, value').eq('key', 'admin_email')
        const adminEmail = (settingsRows?.[0]?.value || '').trim().toLowerCase()
        if (adminEmail && userEmail === adminEmail) includeEmails = true
      }

      const { data, error } = await supabase
        .from('feedback')
        .select('id, user_email, message, created_at')
        .order('created_at', { ascending: false })
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return res.status(200).json([])
        }
        throw error
      }

      const list = (data || []).map((row) => {
        const item = {
          id: row.id,
          message: row.message || '',
          createdAt: row.created_at,
        }
        if (includeEmails) item.userEmail = row.user_email || ''
        return item
      })
      return res.status(200).json(list)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { message, userEmail } = body
      const msg = (message || '').trim()
      const email = (userEmail || '').trim().toLowerCase()
      if (!msg) return res.status(400).json({ error: 'Message is required' })
      if (!email) return res.status(400).json({ error: 'User email is required' })

      const id = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const { error } = await supabase.from('feedback').insert({
        id,
        user_email: email,
        message: msg,
      })
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return res.status(503).json({ error: 'Feedback table not found. Run database/update-add-feedback.sql in Supabase SQL Editor.' })
        }
        throw error
      }
      return res.status(200).json({ ok: true, id })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
