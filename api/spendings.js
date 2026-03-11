import { getSupabase, cors } from '../lib/supabaseServer.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const supabase = getSupabase()

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('spendings').select('*').order('created_at', { ascending: false })
      if (error) throw error
      const list = (data || []).map((row) => ({
        id: row.id,
        description: row.description,
        amount: Number(row.amount) || 0,
        branch: row.branch || '',
      }))
      return res.status(200).json(list)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { action, payload } = body

      if (action === 'set') {
        const list = Array.isArray(payload) ? payload : []
        const rows = list.map((s) => ({
          id: s.id,
          description: s.description,
          amount: Number(s.amount) || 0,
          branch: s.branch || null,
        }))
        const { error } = await supabase.from('spendings').upsert(rows, { onConflict: 'id' })
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'add') {
        const s = payload
        const { error } = await supabase.from('spendings').insert({
          id: s.id,
          description: s.description,
          amount: Number(s.amount) || 0,
          branch: s.branch || null,
        })
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'delete') {
        const { id } = payload
        const { error } = await supabase.from('spendings').delete().eq('id', id)
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
