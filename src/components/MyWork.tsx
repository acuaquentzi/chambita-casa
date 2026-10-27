import { useEffect, useMemo, useState } from 'react'
import { type Task, type BaseTask, STATUSES, STATUS_HEX, HEALTH_HEX, PROJECT_MAP, ALL_OWNERS, dueLabel, firstName } from '../data'
import { Textarea } from '@/components/ui/textarea'
import { InlineDue } from './inline'
import { PersonAvatar } from './charts'
import { SlipBadge } from '../reschedule'
import { Check, ChevronDown, ExternalLink, CornerDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RiskCard } from './RiskCard'
import type { Risks } from '../risks'
import { useAgile, CommitButton, commitStats, inProgressOf, DEFAULT_WIP, WipBadge } from '../agile'

interface Props {
  tasks: Task[]
  myOwner: string | null
  risks: Risks
  onUpdateTask: (key: string, updates: Partial<BaseTask>) => void
  onSelectTask: (key: string) => void
}

const PERSON_KEY = 'ed-mine-person'
const GROUPS: { id: string; label: string; test: (t: Task) => boolean; color: string }[] = [
  { id: 'late', label: 'Atrasadas', test: t => t.daysLeft < 0, color: '#ef4444' },
  { id: 'today', label: 'Vencen hoy', test: t => t.daysLeft === 0, color: '#f59e0b' },
  { id: 'week', label: 'Esta semana', test: t => t.daysLeft >= 1 && t.daysLeft <= 7, color: '#6366f1' },
  { id: 'later', label: 'Más adelante', test: t => t.daysLeft > 7, color: '#94a3b8' },
]

export function MyWork({ risks, tasks, myOwner, onUpdateTask, onSelectTask }: Props) {
  const [person, setPerson] = useState<string>(() => {
    try { const s = localStorage.getItem(PERSON_KEY); if (s && ALL_OWNERS.includes(s)) return s } catch {}
    return myOwner ?? ''
  })
  useEffect(() => { if (!person && myOwner) setPerson(myOwner) }, [myOwner, person])
  const choose = (p: string) => { setPerson(p); try { localStorage.setItem(PERSON_KEY, p) } catch {} }

  const [expanded, setExpanded] = useState<string | null>(null)

  const mine = useMemo(() => tasks
    .filter(t => t.status !== 'Completado' && (t.owner === person || t.coOwner === person))
    .sort((a, b) => a.daysLeft - b.daysLeft), [tasks, person])
  const [showDone, setShowDone] = useState(false)
  const agile = useAgile()
  const done = useMemo(() => tasks
    .filter(t => t.status === 'Completado' && (t.owner === person || t.coOwner === person))
    .sort((a, b) => b.due.localeCompare(a.due)), [tasks, person])

  if (!person) {
    return (
      <div className="max-w-md mx-auto py-8 space-y-4">
        <p className="text-lg font-semibold text-center">¿Quién eres?</p>
        <p className="text-sm text-muted-foreground text-center">Elige tu nombre para ver tus pendientes. Lo recordamos en este dispositivo.</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_OWNERS.map(o => (
            <button key={o} onClick={() => choose(o)} className="flex items-center gap-2 rounded-xl border p-3 hover:bg-muted text-left">
              <PersonAvatar name={o} size="md" /><span className="text-sm font-medium">{o}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const complete = (t: Task) => {
    onUpdateTask(t.key, { status: 'Completado' })
    if (expanded === t.key) setExpanded(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-16">
      <div className="flex items-center gap-3">
        <PersonAvatar name={person} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight">{firstName(person)}, tienes {mine.length} pendiente{mine.length === 1 ? '' : 's'}</p>
          <label className="text-xs text-muted-foreground">
            Ver como{' '}
            <select value={person} onChange={e => choose(e.target.value)} className="bg-transparent underline underline-offset-2 cursor-pointer">
              {ALL_OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none shrink-0">
          <input type="checkbox" className="accent-primary h-4 w-4" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
          Mostrar completadas
        </label>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {GROUPS.map(g => {
          const n = mine.filter(g.test).length
          return (
            <a key={g.id} href={`#mine-${g.id}`} onClick={e => { e.preventDefault(); document.getElementById(`mine-${g.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className="rounded-xl border bg-card p-2 text-center">
              <p className="text-xl font-bold tabular-nums" style={{ color: n ? g.color : undefined }}>{n}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{g.label}</p>
            </a>
          )
        })}
      </div>

      {agile && (() => {
        const c = commitStats(tasks, person, agile.week)
        return (
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold flex-1">Mi compromiso de la semana</p>
              <WipBadge count={inProgressOf(tasks, person)} limit={agile.wipLimit ?? DEFAULT_WIP} />
            </div>
            {c.total === 0 ? (
              <p className="text-xs text-muted-foreground">Elige 3 a 5 tareas que vas a cerrar esta semana con el botón de la diana en cada tarjeta.</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <span className="block h-full rounded-full bg-violet-600" style={{ width: `${(c.done / c.total) * 100}%` }} />
                  </span>
                  <span className="text-xs font-semibold tabular-nums">{c.done} de {c.total} cumplidas</span>
                </div>
                <ul className="space-y-0.5">
                  {c.list.map(t => (
                    <li key={t.key} className={cn('text-xs truncate', t.status === 'Completado' && 'line-through text-muted-foreground')}>• {t.name}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )
      })()}

      <RiskCard risks={risks} onSelectTask={onSelectTask} owner={person} />

      {mine.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Check className="h-8 w-8 text-emerald-500 mx-auto" />
          <p className="font-semibold mt-2">Sin pendientes abiertos</p>
        </div>
      )}

      {GROUPS.map(g => {
        const list = mine.filter(g.test)
        if (!list.length) return null
        return (
          <section key={g.id} id={`mine-${g.id}`} className="space-y-2 scroll-mt-4">
            <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: g.color }}>
              <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />{g.label} · {list.length}
            </h2>
            {list.map(t => {
              const d = dueLabel(t)
              const isOpen = expanded === t.key
              return (
                <div key={t.key} className="rounded-xl border bg-card border-l-4 overflow-hidden" style={{ borderLeftColor: HEALTH_HEX[t.health] }}>
                  <div className="flex items-start gap-3 p-3">
                    <button onClick={() => complete(t)} aria-label={`Marcar ${t.id} como completada`}
                      className="h-10 w-10 shrink-0 rounded-full border-2 border-emerald-500/60 text-emerald-600 flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 transition">
                      <Check className="h-5 w-5" />
                    </button>
                    <button onClick={() => setExpanded(isOpen ? null : t.key)} aria-expanded={isOpen} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {t.id} · {PROJECT_MAP[t.project]?.name}{t.coOwner === person ? ' · corresponsable' : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <span className="block h-full rounded-full" style={{ width: `${t.progress}%`, background: STATUS_HEX[t.status] }} />
                        </span>
                        <span className="text-[11px] tabular-nums text-muted-foreground">{t.progress}%</span>
                        <span className={cn('text-[11px] tabular-nums', d.cls)}>{d.text}</span>
                        <SlipBadge refKey={t.key} />
                        <CommitButton task={t} compact />
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                      </div>
                    </button>
                  </div>
                  {isOpen && <QuickEdit task={t} onUpdateTask={onUpdateTask} onSelectTask={onSelectTask} onComplete={() => complete(t)} />}
                </div>
              )
            })}
          </section>
        )
      })}

      {showDone && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completadas · {done.length}</h2>
          {done.length === 0 && <p className="text-xs text-muted-foreground">Aún no tienes tareas completadas.</p>}
          {done.map(t => (
            <div key={t.key} className="flex items-center gap-3 rounded-xl border bg-card p-3 opacity-75">
              <Check className="h-5 w-5 text-emerald-600 shrink-0" />
              <button onClick={() => onSelectTask(t.key)} className="flex-1 min-w-0 text-left">
                <p className="text-sm line-through decoration-muted-foreground/50 line-clamp-2">{t.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{t.id} · {PROJECT_MAP[t.project]?.name}</p>
              </button>
              <button onClick={() => onUpdateTask(t.key, { status: 'En curso', progress: 90 })}
                className="text-xs text-primary hover:underline shrink-0">Reabrir</button>
            </div>
          ))}
        </section>
      )}

    </div>
  )
}

function QuickEdit({ task: t, onUpdateTask, onSelectTask, onComplete }: { task: Task; onUpdateTask: Props['onUpdateTask']; onSelectTask: (k: string) => void; onComplete: () => void }) {
  const [next, setNext] = useState(t.next)
  useEffect(() => setNext(t.next), [t.next])
  return (
    <div className="border-t bg-muted/30 p-3 space-y-3">
      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5">Estatus</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(s => (
            <button key={s} onClick={() => s === 'Completado' ? onComplete() : onUpdateTask(t.key, { status: s })}
              className={cn('h-9 px-3 rounded-full border text-xs font-medium', t.status === s ? 'text-white border-transparent' : 'bg-card')}
              style={t.status === s ? { background: STATUS_HEX[s] } : undefined}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5">Avance</p>
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 25, 50, 75, 100].map(p => (
            <button key={p} onClick={() => p === 100 ? onComplete() : onUpdateTask(t.key, { progress: p })}
              className={cn('h-9 rounded-lg border text-xs font-semibold tabular-nums', t.progress === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{p}%</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-muted-foreground w-20 shrink-0">Compromiso</p>
        <InlineDue task={t} onUpdate={onUpdateTask} large />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1"><CornerDownRight className="h-3 w-3" />Próximo paso</p>
        <Textarea value={next} onChange={e => setNext(e.target.value)} onBlur={() => next !== t.next && onUpdateTask(t.key, { next })}
          rows={2} className="text-sm resize-none bg-card" placeholder="¿Qué sigue?" />
      </div>
      <button onClick={() => onSelectTask(t.key)} className="text-xs text-primary flex items-center gap-1 hover:underline">
        Ver detalle, comentarios e historial <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  )
}
