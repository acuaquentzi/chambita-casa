import { useState } from 'react'
import { supabase, memberFor } from '../supabase'
import { LOGO } from '../logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Acceso con código de 6 dígitos por correo: funciona dentro de la app instalada en iPhone,
// donde un enlace mágico abriría Safari en lugar de la app.
export function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    const mail = email.trim().toLowerCase()
    if (!memberFor(mail)) { setMsg('Ese correo no tiene acceso a esta app.'); return }
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) setMsg(error.status === 429 ? 'Demasiados intentos. Espera unos minutos.' : `No se pudo enviar el código: ${error.message}`)
    else { setStep('code'); setMsg('Te enviamos un código a tu correo.') }
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setMsg('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setMsg('Código incorrecto o vencido. Pide uno nuevo.')
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <div role="img" aria-label="Chambita" className="w-11 h-11 rounded-xl bg-white shadow shrink-0"
            style={{ backgroundImage: `url(${LOGO})`, backgroundSize: '160%', backgroundPosition: 'center' }} />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Chambita Casa</h1>
            <p className="text-sm text-muted-foreground">Nuestros pendientes, en un solo lugar.</p>
          </div>
        </div>
        {step === 'email' ? (
          <form onSubmit={send} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="email">Tu correo</label>
            <Input id="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@gmail.com" />
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviarme un código'}</Button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="code">Código de 6 dígitos</label>
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="123456" className="text-center text-lg tracking-[0.4em] tabular-nums" />
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>{busy ? 'Verificando…' : 'Entrar'}</Button>
            <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setStep('email'); setCode(''); setMsg('') }}>Usar otro correo o pedir otro código</button>
          </form>
        )}
        {msg && <p className="text-sm text-muted-foreground" role="status">{msg}</p>}
      </div>
    </div>
  )
}
