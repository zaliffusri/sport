import { getSupabase, cors } from '../lib/supabaseServer.js'

function toColleague(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    role: row.role || 'member',
    branch: row.branch || 'Johor',
    points: row.points ?? 0,
    active: row.active !== false,
    amountPaid: Number(row.amount_paid) || 0,
    gameHistory: Array.isArray(row.game_history) ? row.game_history : [],
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const supabase = getSupabase()

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('colleagues').select('*').order('created_at', { ascending: true })
      if (error) throw error
      const list = (data || []).map(toColleague)
      return res.status(200).json(list)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { action, payload } = body

      if (action === 'set') {
        const list = Array.isArray(payload) ? payload : []
        const upsert = list.map((c) => ({
          id: c.id,
          name: c.name,
          email: (c.email || '').trim().toLowerCase(),
          role: c.role || 'member',
          branch: c.branch || 'Johor',
          points: c.points ?? 0,
          active: c.active !== false,
          amount_paid: Number(c.amountPaid) || 0,
          game_history: Array.isArray(c.gameHistory) ? c.gameHistory : [],
          updated_at: new Date().toISOString(),
        }))
        const { error } = await supabase.from('colleagues').upsert(upsert, { onConflict: 'id' })
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'add') {
        const c = payload
        const row = {
          id: c.id,
          name: c.name,
          email: (c.email || '').trim().toLowerCase(),
          role: c.role || 'member',
          branch: c.branch || 'Johor',
          points: c.points ?? 0,
          active: c.active !== false,
          amount_paid: Number(c.amountPaid) || 0,
          game_history: Array.isArray(c.gameHistory) ? c.gameHistory : [],
        }
        const { error } = await supabase.from('colleagues').insert(row)
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'update') {
        const c = payload
        const { error } = await supabase
          .from('colleagues')
          .update({
            name: c.name,
            email: (c.email || '').trim().toLowerCase(),
            role: c.role || 'member',
            branch: c.branch || 'Johor',
            points: c.points ?? 0,
            active: c.active !== false,
            amount_paid: Number(c.amountPaid) || 0,
            game_history: Array.isArray(c.gameHistory) ? c.gameHistory : [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', c.id)
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
