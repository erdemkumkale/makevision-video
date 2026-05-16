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

  // ── Extract order details for admin notification ──────────────────────────
  const attrs = (payload?.data as Record<string, unknown>)
    ?.attributes as Record<string, unknown> | undefined

  const customerEmail = attrs?.user_email as string | undefined
  const customerName  = attrs?.user_name  as string | undefined
  const totalFormatted = attrs?.total_formatted as string | undefined
  const orderNumber   = ((payload?.data as Record<string, unknown>)?.id as string) ?? '—'
  const variantName   = (((attrs?.first_order_item as Record<string, unknown>)
    ?.variant_name) as string | undefined) ?? '—'

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

  // ── Admin sale notification (fire-and-forget) ─────────────────────────────
  const adminNotif = sendAdminSaleEmail({
    orderNumber, customerEmail, customerName, totalFormatted, variantName, projectId,
  })

  // @ts-ignore
  if (typeof EdgeRuntime !== 'undefined') {
    // deno-lint-ignore no-explicit-any
    ;(EdgeRuntime as any).waitUntil(Promise.all([bgJob, adminNotif]))
  }

  return new Response('OK', { status: 200 })
})

// ─── Admin sale notification ──────────────────────────────────────────────────

async function sendAdminSaleEmail(opts: {
  orderNumber: string
  customerEmail?: string
  customerName?: string
  totalFormatted?: string
  variantName?: string
  projectId: string
}) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const adminEmail = Deno.env.get('ADMIN_EMAIL') ?? 'hello@yourvision.video'
  if (!resendKey) return

  const { orderNumber, customerEmail, customerName, totalFormatted, variantName, projectId } = opts
  const now = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Istanbul', hour12: false })

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'YourVision Sales <hello@yourvision.video>',
        to: [adminEmail],
        subject: `💰 New sale — ${totalFormatted ?? '?'} · ${variantName}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0A0908;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0908;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">

        <tr><td style="padding-bottom:32px">
          <span style="font-size:16px;font-weight:300;letter-spacing:0.06em;color:#F4F1EA">YourVision</span>
          <span style="font-size:12px;color:#4A4640;margin-left:12px">Sales Notification</span>
        </td></tr>

        <tr><td style="background:#0F0E0C;border:1px solid #2A2520;border-radius:4px;padding:36px 32px">

          <p style="margin:0 0 24px;font-size:11px;font-weight:500;letter-spacing:0.18em;color:#C9A961">NEW SALE</p>

          <h1 style="margin:0 0 8px;font-size:32px;font-weight:300;color:#F4F1EA;line-height:1.1">
            ${totalFormatted ?? '?'}
          </h1>
          <p style="margin:0 0 32px;font-size:14px;color:#C5BFB8;font-weight:300">${variantName}</p>

          <table cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #1F1D1A;padding-top:24px">
            ${[
              ['Customer', customerName ?? '—'],
              ['Email', customerEmail ?? '—'],
              ['Order #', orderNumber],
              ['Project', projectId],
              ['Time', now],
            ].map(([k, v]) => `
            <tr>
              <td style="padding:7px 0;font-size:12px;color:#6B6560;width:90px">${k}</td>
              <td style="padding:7px 0;font-size:12px;color:#C5BFB8;font-weight:300">${v}</td>
            </tr>`).join('')}
          </table>

        </td></tr>

        <tr><td style="padding-top:24px">
          <p style="margin:0;font-size:11px;color:#4A4640">
            <a href="https://app.lemonsqueezy.com/orders" style="color:#6B6560;text-decoration:none">View in LemonSqueezy →</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    })
    console.log(`Admin sale email sent to ${adminEmail}`)
  } catch (err) {
    console.warn('Admin sale email failed (non-fatal):', err)
  }
}

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
