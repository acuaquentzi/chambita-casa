import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import './index.css'
import App from './App.tsx'
import { Login } from './components/Login'
import { supabase, makeUser } from './supabase'
import { setCurrentUser } from './store'

function Root() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  const uid = session?.user.id
  useMemo(() => setCurrentUser(session ? makeUser(session) : null), [uid])
  if (session === undefined) return null
  if (!session) return <Login />
  // key: al cambiar de usuario se reinicia el estado de la app.
  return <App key={session.user.id} onSignOut={() => supabase.auth.signOut()} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
