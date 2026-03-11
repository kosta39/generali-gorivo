import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        if (!mounted) return
        setSession(currentSession)
      } catch (err) {
        console.error("APP SESSION ERROR:", err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return
      setSession(currentSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <div className="p-10">Učitavanje...</div>
  }

  if (!session) {
    return <LoginPage />
  }

  return <DashboardPage />
}

export default App