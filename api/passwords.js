import bcrypt from 'bcryptjs'
import { getSupabase, cors } from '../lib/supabaseServer.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const supabase = getSupabase()

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('passwords').select('email')
      if (error) throw error
      return res.status(200).json((data || []).map((r) => r.email))
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { action, payload } = body

      if (action === 'set') {
        const map = payload && typeof payload === 'object' ? payload : {}
        for (const [email, plainPassword] of Object.entries(map)) {
          const em = (email || '').trim().toLowerCase()
          if (!em) continue
          const hash = await bcrypt.hash(plainPassword || '', 10)
          await supabase.from('passwords').upsert({ email: em, password_hash: hash }, { onConflict: 'email' })
        }
        return res.status(200).json({ ok: true })
      }

      if (action === 'setOne') {
        const { email, password } = payload || {}
        const em = (email || '').trim().toLowerCase()
        if (!em) return res.status(400).json({ error: 'Email required' })
        const hash = await bcrypt.hash(password || '', 10)
        const { error } = await supabase.from('passwords').upsert({ email: em, password_hash: hash }, { onConflict: 'email' })
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
