import { getSupabase, cors } from '../lib/supabaseServer.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const supabase = getSupabase()

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      const list = (data || []).map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        message: row.message,
        userEmail: row.user_email,
      }))
      return res.status(200).json(list)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { action, payload } = body

      if (action === 'add') {
        const { id, timestamp, message, userEmail } = payload
        const { error } = await supabase.from('audit_log').insert({
          id,
          timestamp: timestamp || new Date().toISOString(),
          message,
          user_email: userEmail,
        })
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'set') {
        const list = Array.isArray(payload) ? payload : []
        const rows = list.map((e) => ({
          id: e.id,
          timestamp: e.timestamp,
          message: e.message,
          user_email: e.userEmail,
        }))
        const { error } = await supabase.from('audit_log').upsert(rows, { onConflict: 'id' })
        if (error) throw error
        return res.status(200).json({ ok: true })
      }
    }

    return res.status(400).json({ error: 'Bad request' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
