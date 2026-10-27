import { useState } from 'react'
import { supabase, memberFor } from '../supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogoMark } from './LogoMark'

// Acceso con correo y contraseña: no depende de enviar correos (el SMTP gratuito de Supabase es muy limitado)
// y funciona dentro de la app instalada en iPhone. Solo los correos de config.ts pueden entrar.
export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const mail = email.trim().toLowerCase()
    if (!memberFor(mail)) { setMsg('Ese correo no tiene acceso a esta app.'); return }
    if (password.length < 8) { setMsg('La contraseña debe tener al menos 8 caracteres.'); return }
    setBusy(true); setMsg('')
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: mail, password })
      setBusy(false)
      if (error) setMsg(/registered|exists/i.test(error.message) ? 'Ese correo ya tiene contraseña. Usa "Entrar".' : `No se pudo crear: ${error.message}`)
      else if (!data.session) setMsg('Cuenta creada, pero falta desactivar "Confirm email" en Supabase (ver README).')
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password })
    setBusy(false)
    if (error) setMsg(/invalid/i.test(error.message) ? 'Correo o contraseña incorrectos. Si es tu primera vez, toca "Crear mi contraseña".' : `No se pudo entrar: ${error.message}`)
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <LogoMark className="h-11 w-11 shadow" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Marea</h1>
            <p className="text-sm text-muted-foreground">Finanzas, proyectos y hogar en un solo lugar.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">Correo</label>
          <Input id="email" type="email" inputMode="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@gmail.com" />
          <label className="block text-sm font-medium" htmlFor="password">{mode === 'signup' ? 'Crea tu contraseña (mínimo 8)' : 'Contraseña'}</label>
          <Input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Un momento…' : mode === 'signup' ? 'Crear mi contraseña y entrar' : 'Entrar'}</Button>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setMode(m => (m === 'login' ? 'signup' : 'login')); setMsg('') }}>
            {mode === 'login' ? 'Primera vez: crear mi contraseña' : 'Ya tengo contraseña: entrar'}
          </button>
        </form>
        {msg && <p className="text-sm text-muted-foreground" role="status">{msg}</p>}
      </div>
    </div>
  )
}
