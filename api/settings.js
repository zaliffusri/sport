import { getSupabase, cors } from '../lib/supabaseServer.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const supabase = getSupabase()

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('app_settings').select('key, value')
      if (error) throw error
      const out = {}
      ;(data || []).forEach((row) => { out[row.key] = row.value })
      return res.status(200).json(out)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { key, value } = body
      if (!key) return res.status(400).json({ error: 'Missing key' })
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value: String(value ?? ''), updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: 'Bad request' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
