import '../styles/globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { AuthProvider } from '../contexts/AuthContext'
import { initPostHog, capturePageview } from '../lib/analytics'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    initPostHog()
    capturePageview(window.location.href)

    const handleRouteChange = (url) => capturePageview(window.location.origin + url)
    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}
