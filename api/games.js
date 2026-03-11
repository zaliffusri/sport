import { getSupabase, cors } from '../lib/supabaseServer.js'

function toGame(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'standard',
    active: row.active !== false,
    description: row.description || '',
    date: row.date || '',
    participants: Array.isArray(row.participants) ? row.participants : [],
    pointsPerJoin: row.points_per_join != null ? row.points_per_join : undefined,
    pointsPerScan: Number(row.points_per_scan) || 10,
    scannedBy: Array.isArray(row.scanned_by) ? row.scanned_by : [],
    guessQuestion: row.guess_question || '',
    guessAnswers: row.guess_answers && typeof row.guess_answers === 'object' ? row.guess_answers : {},
    guessCorrectAnswer: row.guess_correct_answer || '',
    guessPointsJoin: row.guess_points_join != null ? row.guess_points_join : 1,
    guessPointsCorrect: row.guess_points_correct != null ? row.guess_points_correct : 1,
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const supabase = getSupabase()

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('games').select('*').order('created_at', { ascending: true })
      if (error) throw error
      const list = (data || []).map(toGame)
      return res.status(200).json(list)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { action, payload } = body

      if (action === 'set') {
        const list = Array.isArray(payload) ? payload : []
        const rows = list.map((g) => ({
          id: g.id,
          name: g.name,
          type: g.type || 'standard',
          active: g.active !== false,
          description: g.description || '',
          date: g.date || '',
          participants: Array.isArray(g.participants) ? g.participants : [],
          points_per_join: g.pointsPerJoin,
          points_per_scan: Number(g.pointsPerScan) || 10,
          scanned_by: Array.isArray(g.scannedBy) ? g.scannedBy : [],
          guess_question: g.guessQuestion || '',
          guess_answers: g.guessAnswers && typeof g.guessAnswers === 'object' ? g.guessAnswers : {},
          guess_correct_answer: g.guessCorrectAnswer || '',
          guess_points_join: g.guessPointsJoin,
          guess_points_correct: g.guessPointsCorrect,
          updated_at: new Date().toISOString(),
        }))
        const { error } = await supabase.from('games').upsert(rows, { onConflict: 'id' })
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'add') {
        const g = payload
        const row = {
          id: g.id,
          name: g.name,
          type: g.type || 'standard',
          active: g.active !== false,
          description: g.description || '',
          date: g.date || '',
          participants: Array.isArray(g.participants) ? g.participants : [],
          points_per_join: g.pointsPerJoin,
          points_per_scan: Number(g.pointsPerScan) || 10,
          scanned_by: Array.isArray(g.scannedBy) ? g.scannedBy : [],
          guess_question: g.guessQuestion || '',
          guess_answers: g.guessAnswers && typeof g.guessAnswers === 'object' ? g.guessAnswers : {},
          guess_correct_answer: g.guessCorrectAnswer || '',
          guess_points_join: g.guessPointsJoin,
          guess_points_correct: g.guessPointsCorrect,
        }
        const { error } = await supabase.from('games').insert(row)
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'update') {
        const g = payload
        const { error } = await supabase
          .from('games')
          .update({
            name: g.name,
            type: g.type || 'standard',
            active: g.active !== false,
            description: g.description || '',
            date: g.date || '',
            participants: Array.isArray(g.participants) ? g.participants : [],
            points_per_join: g.pointsPerJoin,
            points_per_scan: Number(g.pointsPerScan) || 10,
            scanned_by: Array.isArray(g.scannedBy) ? g.scannedBy : [],
            guess_question: g.guessQuestion || '',
            guess_answers: g.guessAnswers && typeof g.guessAnswers === 'object' ? g.guessAnswers : {},
            guess_correct_answer: g.guessCorrectAnswer || '',
            guess_points_join: g.guessPointsJoin,
            guess_points_correct: g.guessPointsCorrect,
            updated_at: new Date().toISOString(),
          })
          .eq('id', g.id)
        if (error) throw error
        return res.status(200).json({ ok: true })
      }

      if (action === 'delete') {
        const { id } = payload
        const { error } = await supabase.from('games').delete().eq('id', id)
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
