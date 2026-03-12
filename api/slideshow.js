import { getSupabase, cors } from '../lib/supabaseServer.js'

const BUCKET = 'slideshow'
const MAX_IMAGES_PER_POST = 3

function toSlide(row, fallbackPostId) {
  if (!row) return null
  return {
    id: row.id,
    postId: row.post_id != null && row.post_id !== '' ? row.post_id : (fallbackPostId || row.id),
    imageOrder: row.image_order ?? 0,
    imageUrl: row.image_url || '',
    title: row.title || '',
    description: row.description || '',
    displayDate: row.display_date || '',
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  }
}

/** Group rows by post_id into posts with images array (max 3 per post) */
function groupRowsIntoPosts(rows) {
  const byPost = new Map()
  for (const row of rows || []) {
    const s = toSlide(row, row.id)
    if (!s.postId) continue
    if (!byPost.has(s.postId)) {
      byPost.set(s.postId, {
        id: s.postId,
        title: s.title,
        description: s.description,
        displayDate: s.displayDate,
        sortOrder: s.sortOrder,
        createdAt: s.createdAt,
        images: [],
      })
    }
    const post = byPost.get(s.postId)
    while (post.images.length <= s.imageOrder) post.images.push('')
    post.images[s.imageOrder] = s.imageUrl
  }
  const posts = Array.from(byPost.values())
  posts.forEach((p) => { p.images = p.images.filter(Boolean) })
  posts.sort((a, b) => a.sortOrder - b.sortOrder || new Date(a.createdAt) - new Date(b.createdAt))
  return posts
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
      const posts = groupRowsIntoPosts(data || [])
      return res.status(200).json(posts)
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const { action, payload } = body

      if (action === 'add') {
        const { images: imagesBase64, title, description, displayDate } = payload || {}
        const arr = Array.isArray(imagesBase64) ? imagesBase64 : (imagesBase64 != null ? [imagesBase64] : [])
        if (arr.length === 0 || arr.length > MAX_IMAGES_PER_POST) {
          return res.status(400).json({ error: `Send 1 to ${MAX_IMAGES_PER_POST} images per post` })
        }
        const postId = `post-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        const titleStr = String(title ?? '').trim()
        const descStr = String(description ?? '').trim()
        const dateStr = String(displayDate ?? '').trim()
        const sortOrder = Math.floor(Date.now() / 1000)

        for (let imageOrder = 0; imageOrder < arr.length; imageOrder++) {
          const imageBase64 = arr[imageOrder]
          let imageUrl = ''
          const id = `${postId}-${imageOrder}`

          if (imageBase64) {
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
            if (uploadError) {
              const m = uploadError.message || ''
              if (m.includes('Bucket not found') || m.includes('not found') || m.includes('404')) {
                return res.status(503).json({ error: "Slideshow storage not set up. In Supabase go to Storage → New bucket → name it 'slideshow' → set to Public." })
              }
              throw uploadError
            }
            const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
            imageUrl = urlData?.publicUrl || ''
          }
          if (!imageUrl) return res.status(400).json({ error: `Missing or invalid image at index ${imageOrder + 1}` })

          const { error: insertError } = await supabase.from('slideshow').insert({
            id,
            post_id: postId,
            image_order: imageOrder,
            image_url: imageUrl,
            title: titleStr,
            description: descStr,
            display_date: dateStr,
            sort_order: sortOrder,
          })
          if (insertError) {
            const m = insertError.message || ''
            if (insertError.code === '42P01' || m.includes('does not exist') || m.includes('relation')) {
              return res.status(503).json({ error: "Slideshow table not found. Run database/schema.sql or update-add-slideshow.sql in Supabase SQL Editor." })
            }
            throw insertError
          }
        }
        return res.status(200).json({ ok: true, id: postId })
      }

      if (action === 'delete') {
        const postId = payload?.id
        if (!postId) return res.status(400).json({ error: 'Missing post id' })
        const { error: delError } = await supabase.from('slideshow').delete().eq('post_id', postId)
        if (delError) throw delError
        return res.status(200).json({ ok: true })
      }

      return res.status(400).json({ error: 'Unknown action' })
    }

    if (req.method === 'DELETE') {
      const postId = typeof req.query?.id === 'string' ? req.query.id : req.body?.id
      if (!postId) return res.status(400).json({ error: 'Missing post id' })
      const { error } = await supabase.from('slideshow').delete().eq('post_id', postId)
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
    if (err.code === '42P01' || String(msg).includes('does not exist') || String(msg).includes('relation')) {
      return res.status(503).json({ error: "Slideshow table not found. Run database/schema.sql or update-add-slideshow.sql in Supabase SQL Editor." })
    }
    if (String(msg).includes('Bucket') || String(msg).includes('storage') || String(msg).includes('404')) {
      return res.status(503).json({ error: "Slideshow storage not set up. In Supabase create a public Storage bucket named 'slideshow'." })
    }
    return res.status(500).json({ error: msg })
  }
}
