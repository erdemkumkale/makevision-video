// PostHog analytics helper.
// Usage:
//   import { track } from '@/lib/analytics'  (or '../lib/analytics')
//   track('event_name', { prop1: 'value' })
//
// Identify a user once they sign in:
//   identifyUser(user.id, { email: user.email })
//
// Reset on sign-out:
//   resetUser()

import posthog from 'posthog-js'

const POSTHOG_KEY  = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'

let initialized = false

export function initPostHog() {
  if (initialized || typeof window === 'undefined' || !POSTHOG_KEY) return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',  // sadece login olanlar için kalıcı profil
    capture_pageview: false,              // pageview'leri manuel atıyoruz (router için)
    capture_pageleave: true,
    autocapture: true,                    // butona/linke tıklamaları otomatik yakala
    session_recording: { maskAllInputs: true },
    loaded: (ph) => {
      if (process.env.NODE_ENV !== 'production') ph.debug(false)
    },
  })
  initialized = true
}

export function track(event, props) {
  if (typeof window === 'undefined' || !initialized) return
  posthog.capture(event, props)
}

export function identifyUser(userId, props) {
  if (typeof window === 'undefined' || !initialized) return
  posthog.identify(userId, props)
}

export function resetUser() {
  if (typeof window === 'undefined' || !initialized) return
  posthog.reset()
}

export function capturePageview(url) {
  if (typeof window === 'undefined' || !initialized) return
  posthog.capture('$pageview', { $current_url: url })
}
