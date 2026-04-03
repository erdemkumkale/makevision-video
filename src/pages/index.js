import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../contexts/AuthContext'

// Root redirects to /dashboard if logged in, else /login
export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? '/dashboard' : '/login')
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-glow-soft border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
