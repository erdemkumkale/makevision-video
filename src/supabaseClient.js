import { createClient } from '@supabase/supabase-js'

// Hardcoded — public anon key, safe to expose in client bundle
const supabaseUrl  = 'https://ibcxaytaewufzluxnjbc.supabase.co'
const supabaseAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliY3hheXRhZXd1ZnpsdXhuamJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDk3OTEsImV4cCI6MjA4OTMyNTc5MX0.KAn8sKGlbIpACo5UO6oDWIyJZoIJfC4XBx4hGM7xjiw'

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
  },
})
