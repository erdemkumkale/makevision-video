// supabase/functions/lemonsqueezy-webhook/index.ts
//
// Receives LemonSqueezy order_created webhooks.
// 1. Verifies HMAC-SHA256 signature
// 2. Extracts project_id + user_id from custom data
// 3. Updates project status → 'Processing'
// 4. Triggers generate-video via internal service call

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await req.text()

  // ── Verify signature ──────────────────────────────────────────────────────
  const secret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET not set')
    return new Response('Internal Server Error', { status: 500 })
  }

  const signature = req.headers.get('X-Signature') ?? req.headers.get('x-signature') ?? ''
  const valid = await verifySignature(secret, rawBody, signature)
  if (!valid) {
    console.error('Invalid webhook signature')
    return new Response('Unauthorized', { status: 401 })
  }

  // ── Parse payload ─────────────────────────────────────────────────────────
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const eventName = (payload?.meta as Record<string, unknown>)?.event_name as string
  console.log(`LemonSqueezy event: ${eventName}`)

  // Only handle order_created
  if (eventName !== 'order_created') {
    return new Response('OK', { status: 200 })
  }

  // Check order status — only proceed for paid orders
  const orderStatus = ((payload?.data as Record<string, unknown>)
    ?.attributes as Record<string, unknown>)?.status as string
  if (orderStatus !== 'paid') {
    console.log(`Order status is ${orderStatus}, skipping`)
    return new Response('OK', { status: 200 })
  }

  // ── Extract custom data ───────────────────────────────────────────────────
  const customData = (payload?.meta as Record<string, unknown>)
    ?.custom_data as Record<string, string> | undefined

  const projectId = customData?.project_id
  const userId    = customData?.user_id

  if (!projectId || !userId) {
    console.error('Missing project_id or user_id in custom_data', customData)
    return new Response('Bad Request', { status: 400 })
  }

  console.log(`Payment confirmed — project: ${projectId}, user: ${userId}`)

  // ── Update project status ─────────────────────────────────────────────────
  const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { error: updateError } = await supabase
    .from('vision_projects')
    .update({ status: 'Processing' })
    .eq('id', projectId)
    .eq('user_id', userId)

  if (updateError) {
    console.error('Failed to update project status:', updateError)
    return new Response('Internal Server Error', { status: 500 })
  }

  // ── Trigger generate-video (fire-and-forget) ──────────────────────────────
  const generateVideoUrl = `${supabaseUrl}/functions/v1/generate-video`

  const bgJob = fetch(generateVideoUrl, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'X-Internal-Service': 'lemonsqueezy-webhook',
    },
    body: JSON.stringify({ project_id: projectId, user_id: userId }),
  }).then((res) => {
    console.log(`generate-video triggered: HTTP ${res.status}`)
  }).catch((err) => {
    console.error('generate-video trigger failed:', err)
  })

  // @ts-ignore
  if (typeof EdgeRuntime !== 'undefined') {
    // deno-lint-ignore no-explicit-any
    ;(EdgeRuntime as any).waitUntil(bgJob)
  }

  return new Response('OK', { status: 200 })
})

// ─── HMAC-SHA256 signature verification ───────────────────────────────────────

async function verifySignature(secret: string, body: string, signature: string): Promise<boolean> {
  if (!signature) return false
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const sigBytes = hexToBytes(signature)
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body))
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}
