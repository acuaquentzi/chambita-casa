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
    <div className="marea-shell min-h-full px-4 py-6 sm:grid sm:place-items-center">
      <div className="marea-surface mx-auto grid w-full max-w-4xl overflow-hidden sm:grid-cols-[1.05fr_.95fr]">
        <section className="marea-hero relative hidden min-h-[560px] flex-col justify-between overflow-hidden p-10 text-white sm:flex">
          <div className="flex items-center gap-3"><LogoMark className="h-12 w-12" /><div><p className="text-xl font-extrabold">Marea</p><p className="text-xs uppercase tracking-[.18em] text-white/50">Nuestra vida, en orden</p></div></div>
          <div><p className="max-w-sm text-4xl font-extrabold leading-[1.08] tracking-[-.045em]">Lo importante de dos vidas, en un solo lugar.</p><p className="mt-4 max-w-sm text-sm leading-6 text-white/65">Finanzas sin capturas diarias, pendientes claros y espacio para organizar el hogar sin complicaciones.</p></div>
          <div className="flex gap-2"><span className="rounded-full bg-blue-300/15 px-3 py-1.5 text-xs font-semibold text-blue-100">● Momio</span><span className="rounded-full bg-pink-300/15 px-3 py-1.5 text-xs font-semibold text-pink-100">● Momia</span></div>
        </section>
        <section className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 sm:hidden"><LogoMark className="h-12 w-12" /><div><h1 className="text-2xl font-extrabold">Marea</h1><p className="text-sm text-muted-foreground">Nuestra vida, en orden.</p></div></div>
          <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-pink-500">Bienvenidos a casa</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-.035em]">Entrar a Marea</h2><p className="mt-2 text-sm text-muted-foreground">Un espacio privado para Momio y Momia.</p></div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">Correo</label>
          <Input id="email" type="email" inputMode="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@gmail.com" />
          <label className="block text-sm font-medium" htmlFor="password">{mode === 'signup' ? 'Crea tu contraseña (mínimo 8)' : 'Contraseña'}</label>
          <Input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)} />
          <Button type="submit" className="h-11 w-full rounded-xl bg-[#15365f] shadow-soft hover:bg-[#0d294b]" disabled={busy}>{busy ? 'Un momento…' : mode === 'signup' ? 'Crear mi contraseña y entrar' : 'Entrar'}</Button>
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setMode(m => (m === 'login' ? 'signup' : 'login')); setMsg('') }}>
            {mode === 'login' ? 'Primera vez: crear mi contraseña' : 'Ya tengo contraseña: entrar'}
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-muted-foreground" role="status">{msg}</p>}
        </section>
      </div>
    </div>
  )
}
