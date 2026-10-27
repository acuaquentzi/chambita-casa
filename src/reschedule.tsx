import { createContext, useContext, useState } from 'react'
import { type Reschedule, RESCHEDULE_REASONS, isSlip, daysBetween, fmtDate } from './data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RescheduleApi {
  list: Reschedule[]
  rescheduleTask: (key: string, to: string, reason: string, note: string) => void
  rescheduleProject: (id: string, to: string, reason: string, note: string) => void
  nameFor: (id: string | null) => string
}

const Ctx = createContext<RescheduleApi | null>(null)
export const RescheduleProvider = Ctx.Provider
export const useReschedules = () => useContext(Ctx)

export const historyFor = (list: Reschedule[], kind: Reschedule['kind'], ref: string) =>
  list.filter(r => r.kind === kind && r.ref === ref).sort((a, b) => a.at.localeCompare(b.at))
export const slipCount = (list: Reschedule[], kind: Reschedule['kind'], ref: string) =>
  list.filter(r => r.kind === kind && r.ref === ref && isSlip(r)).length

export function SlipBadge({ refKey, kind = 'task', className }: { refKey: string; kind?: Reschedule['kind']; className?: string }) {
  const api = useReschedules()
  const n = api ? slipCount(api.list, kind, refKey) : 0
  if (!n) return null
  return (
    <span title={`Fecha movida ${n} ${n === 1 ? 'vez' : 'veces'}`}
      className={cn('inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-semibold tabular-nums shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', className)}>
      <CalendarClock className="h-3 w-3" />{n}×
    </span>
  )
}

export function RescheduleForm({ current, label, onSave, onCancel }: {
  current: string; label: string; onSave: (to: string, reason: string, note: string) => void; onCancel?: () => void
}) {
  const [to, setTo] = useState(current)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const valid = /^20\d\d-\d\d-\d\d$/.test(to)
  const later = valid && to > current
  const earlier = valid && to < current
  const days = valid ? daysBetween(current, to) : 0
  const ok = valid && to !== current && (!later || !!reason) && (reason !== 'Otro' || !!note.trim())

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium block mb-1">{label}</label>
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9" />
        <p className={cn('text-[11px] mt-1', later ? 'text-amber-700 dark:text-amber-400' : earlier ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
          {later ? `Se atrasa ${days} día${days === 1 ? '' : 's'}: elige el motivo` : earlier ? `Se adelanta ${-days} día${days === -1 ? '' : 's'}` : `Actual: ${fmtDate(current, { day: 'numeric', month: 'long' })}`}
        </p>
      </div>
      {later && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Motivo del cambio">
          {RESCHEDULE_REASONS.map(r => (
            <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)}
              className={cn('text-[11px] rounded-full border px-2.5 py-1 transition-colors', reason === r ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
              {r}
            </button>
          ))}
        </div>
      )}
      {(later || earlier) && (
        <Input value={note} onChange={e => setNote(e.target.value)} maxLength={200} className="h-8 text-xs"
          placeholder={reason === 'Otro' ? 'Describe el motivo (obligatorio)' : 'Nota (opcional)'} />
      )}
      <div className="flex justify-end gap-2">
        {onCancel && <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>Cancelar</Button>}
        <Button size="sm" className="h-8" disabled={!ok} onClick={() => onSave(to, later ? reason : 'Se adelantó', note.trim())}>Guardar fecha</Button>
      </div>
    </div>
  )
}

export function RescheduleHistory({ kind, refKey, className }: { kind: Reschedule['kind']; refKey: string; className?: string }) {
  const api = useReschedules()
  if (!api) return null
  const items = historyFor(api.list, kind, refKey)
  if (!items.length) return null
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-[11px] text-muted-foreground">
        Fecha original: <b className="text-foreground">{fmtDate(items[0].from, { day: 'numeric', month: 'short', year: 'numeric' })}</b>
        {' · '}movida {items.filter(isSlip).length} {items.filter(isSlip).length === 1 ? 'vez' : 'veces'}
      </p>
      <ul className="space-y-0.5">
        {items.map(r => (
          <li key={r.id} className="text-[11px] text-muted-foreground flex flex-wrap gap-x-1.5">
            <span className="tabular-nums">{fmtDate(r.from)} → {fmtDate(r.to)}</span>
            <span className={cn('font-medium', isSlip(r) ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400')}>{r.reason}</span>
            {r.note && <span>“{r.note}”</span>}
            <span>· {api.nameFor(r.by)}, {new Date(r.at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
