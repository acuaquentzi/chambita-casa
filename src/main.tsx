sed: --: No such file or directory
import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import './index.css'
import App from './App.tsx'
import { Login } from './components/Login'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config'
import { supabase, makeUser } from './supabase'

function Root() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  const uid = session?.user.id
  const appUser = useMemo(() => session ? makeUser(session) : null, [uid])
  useEffect(() => { appUser?.syncProfile() }, [appUser])
  if (session === undefined) return null
  if (!session || !appUser) return <Login />
  // key: al cambiar de usuario se reinicia el estado de la app.
  return <App key={session.user.id} user={appUser} onSignOut={() => supabase.auth.signOut()} />
}

const missing = [!SUPABASE_URL && 'VITE_SUPABASE_URL', !SUPABASE_ANON_KEY && 'VITE_SUPABASE_ANON_KEY'].filter(Boolean)

createRoot(document.getElementById('root')!).render(missing.length ? (
  <div style={{ padding: 24, fontFamily: 'system-ui', lineHeight: 1.5 }}>
    <h1 style={{ fontSize: 18 }}>Falta configuración</h1>
    <p>En Vercel → Settings → Environment Variables falta: <b>{missing.join(', ')}</b>. Agrégala y vuelve a publicar (Deployments → Redeploy).</p>
  </div>
) : 
  <StrictMode>
    <Root />
  </StrictMode>
)
