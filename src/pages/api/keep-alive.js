// Vercel cron tarafından her 6 günde bir tetiklenir.
// Supabase'e basit bir sorgu atarak 7-gün inactivity timeout'unu sıfırlar.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Vercel cron isteği veya manuel test
  const isVercelCron = req.headers['user-agent']?.includes('vercel-cron')
  const isAuthorized = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`

  if (!isVercelCron && !isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { count, error } = await supabase
    .from('vision_projects')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Keep-alive query failed:', error)
    return res.status(500).json({ ok: false, error: error.message })
  }

  return res.status(200).json({
    ok: true,
    project_count: count,
    timestamp: new Date().toISOString(),
  })
}
