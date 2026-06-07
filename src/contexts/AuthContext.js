import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { identifyUser, resetUser, track } from '../lib/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load profile from public.users — always resolves, never throws
  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) console.error('[AuthContext] loadProfile error:', error.message)
      setProfile(data ?? null)
    } catch (err) {
      console.error('[AuthContext] loadProfile unexpected error:', err)
      setProfile(null)
    }
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('[AuthContext] getSession error:', error.message)
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadProfile(u.id).finally(() => { if (mounted) setLoading(false) })
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        identifyUser(u.id, { email: u.email, provider: u.app_metadata?.provider })
        if (_event === 'SIGNED_IN') track('user_signed_in', { provider: u.app_metadata?.provider ?? 'email' })
        loadProfile(u.id).finally(() => { if (mounted) setLoading(false) })
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })

  const signInWithApple = () =>
    supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })

  const signInWithEmail = async (email, password) => {
    console.log('[AuthContext] signInWithEmail →', email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[AuthContext] signInWithEmail error:', error.message, error)
      throw error
    }
    console.log('[AuthContext] signInWithEmail success, user:', data.user?.id)
    return data
  }

  const signUpWithEmail = async (email, password) => {
    console.log('[AuthContext] signUpWithEmail →', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) {
      console.error('[AuthContext] signUpWithEmail error:', error.message, error)
      throw error
    }
    console.log('[AuthContext] signUpWithEmail success, session:', data.session ? 'present' : 'null (confirm email)')
    return data
  }

  const signOut = async () => {
    track('user_signed_out')
    await supabase.auth.signOut()
    resetUser()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithGoogle, signInWithApple,
      signInWithEmail, signUpWithEmail,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
