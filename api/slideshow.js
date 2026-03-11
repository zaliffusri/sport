import { getSupabase, cors } from '../lib/supabaseServer.js'

const BUCKET = 'slideshow'

function toSlide(row) {
  if (!row) return null
  return {
    id: row.id,
    imageUrl: row.image_url || '',
    title: row.title || '',
    description: row.description || '',
    displayDate: row.display_date || '',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    const supabase = getSupabase()

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('slideshow')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return res.status(200).json([])
        }
        throw error
      }
      const list = (data || []).map(toSlide)
      return res.status(200).json(list)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { action, payload } = body

      if (action === 'add') {
        const { imageBase64, title, description, displayDate } = payload || {}
        const id = `slide-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        let imageUrl = payload?.imageUrl || ''

        if (imageBase64 && !imageUrl) {
          const match = String(imageBase64).match(/^data:([^;]+);base64,(.+)$/)
          const base64Data = match ? match[2] : imageBase64
          const contentType = match && match[1] ? match[1].trim() : 'image/jpeg'
          const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg'
          const path = `${id}.${ext}`
          const buffer = Buffer.from(base64Data, 'base64')
          if (buffer.length > 4 * 1024 * 1024) {
            return res.status(400).json({ error: 'Image too large (max 4MB)' })
          }
          const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, buffer, { contentType: contentType.split(';')[0].trim(), upsert: true })
          if (uploadError) throw uploadError
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
          imageUrl = urlData?.publicUrl || ''
        }

        if (!imageUrl) return res.status(400).json({ error: 'Missing image (imageBase64 or imageUrl)' })

        const { error: insertError } = await supabase.from('slideshow').insert({
          id,
          image_url: imageUrl,
          title: String(title ?? '').trim(),
          description: String(description ?? '').trim(),
          display_date: String(displayDate ?? '').trim(),
          sort_order: 0,
        })
        if (insertError) throw insertError
        return res.status(200).json({ ok: true, id })
      }

      if (action === 'delete') {
        const id = payload?.id
        if (!id) return res.status(400).json({ error: 'Missing slide id' })
        const { error: delError } = await supabase.from('slideshow').delete().eq('id', id)
        if (delError) throw delError
        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ error: 'Unknown action' })
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query?.id === 'string' ? req.query.id : req.body?.id
      if (!id) return res.status(400).json({ error: 'Missing slide id' })
      const { error } = await supabase.from('slideshow').delete().eq('id', id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('slideshow API', err)
    const msg = err.message || 'Server error'
    if (req.method === 'GET' && (err.code === '42P01' || String(msg).includes('does not exist'))) {
      return res.status(200).json([])
    }
    return res.status(500).json({ error: msg })
  }
}
