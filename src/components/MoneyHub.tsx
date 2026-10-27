import { ArrowRight, Landmark, ReceiptText, RefreshCw, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props { onOpenProjects: () => void }

const modules = [
  { icon: WalletCards, title: 'Cuentas y tarjetas', text: 'Saldos, límites, fechas de corte y fechas de pago.' },
  { icon: ReceiptText, title: 'Movimientos', text: 'Gastos, ingresos y transferencias sin duplicar pagos de tarjetas.' },
  { icon: Landmark, title: 'Plan de pagos', text: 'Obligaciones, mensualidades y dinero disponible después de compromisos.' },
  { icon: RefreshCw, title: 'Conciliación', text: 'Revisión cada 5 o 7 días mediante CSV, texto o asistencia con Codex.' },
]

export function MoneyHub({ onOpenProjects }: Props) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 px-5 py-7 text-white shadow-sm sm:px-8 sm:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Marea se integra a Chambita</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">El dinero del hogar, conectado con lo que quieren lograr.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Esta sección será el centro financiero compartido. En el siguiente paso conectaremos cuentas, tarjetas, movimientos y compromisos sin modificar todavía sus datos reales.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs text-white/55">Estado de integración</p>
            <p className="mt-1 font-semibold">Estructura preparada</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/4 rounded-full bg-emerald-400" /></div>
            <p className="mt-2 text-[11px] text-white/50">Paso 2 de 6</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {modules.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon className="h-5 w-5" /></div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Proyectos con presupuesto, sin burocracia</p>
          <p className="mt-1 text-sm text-muted-foreground">Vincular un gasto con un proyecto será opcional. Los gastos cotidianos seguirán siendo rápidos de registrar.</p>
        </div>
        <Button variant="outline" className="shrink-0 gap-2" onClick={onOpenProjects}>Ver proyectos <ArrowRight className="h-4 w-4" /></Button>
      </section>
    </div>
  )
}
