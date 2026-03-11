import bcrypt from 'bcryptjs'
import { getSupabase, cors } from '../lib/supabaseServer.js'

const DEFAULT_PASSWORD = 'P@ssw0rd'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const { email, password } = body
    const emailTrim = (email || '').trim().toLowerCase()
    if (!emailTrim || !password) return res.status(400).json({ error: 'Email and password required' })

    const supabase = getSupabase()

    const { data: settingsRows } = await supabase.from('app_settings').select('key, value').in('key', ['admin_email'])
    const settings = {}
    ;(settingsRows || []).forEach((r) => { settings[r.key] = r.value })
    const adminEmail = (settings.admin_email || '').trim().toLowerCase()

    const adminPassword = process.env.ADMIN_PASSWORD || 'P@ssw0rd'
    if (emailTrim === adminEmail && password === adminPassword) {
      return res.status(200).json({ userEmail: emailTrim, isAdmin: true })
    }

    const { data: pwRow, error: pwError } = await supabase.from('passwords').select('password_hash').eq('email', emailTrim).single()
    if (pwError || !pwRow) return res.status(401).json({ error: 'Invalid email or password' })

    const match = await bcrypt.compare(password, pwRow.password_hash)
    if (!match) {
      const defaultMatch = password === DEFAULT_PASSWORD
      if (defaultMatch) {
        const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
        await supabase.from('passwords').upsert({ email: emailTrim, password_hash: hash }, { onConflict: 'email' })
        const { data: col } = await supabase.from('colleagues').select('id, active').eq('email', emailTrim).single()
        if (col && col.active === false) return res.status(401).json({ error: 'This account is inactive. Contact an administrator.' })
        return res.status(200).json({ userEmail: emailTrim, isAdmin: false })
      }
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const { data: col } = await supabase.from('colleagues').select('id, active').eq('email', emailTrim).single()
    if (col && col.active === false) return res.status(401).json({ error: 'This account is inactive. Contact an administrator.' })

    return res.status(200).json({ userEmail: emailTrim, isAdmin: false })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
