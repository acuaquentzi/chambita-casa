import { useState } from 'react'
import { type Task, type Status, type Priority, STATUSES, PRIORITIES, ALL_OWNERS } from '../data'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { RescheduleForm, useReschedules } from '../reschedule'
import { useAgile } from '../agile'
import type { Update } from './inline'
import { CalendarClock, Target, X } from 'lucide-react'

interface Props {
  selected: Task[]
  onUpdateTask: Update
  onClear: () => void
}

const sel = 'h-8 rounded-md border bg-card px-2 text-xs font-medium hover:border-primary/40 cursor-pointer'

export function BulkBar({ selected, onUpdateTask, onClear }: Props) {
  const rs = useReschedules()
  const agile = useAgile()
  const [dateOpen, setDateOpen] = useState(false)
  const n = selected.length
  const apply = (u: Parameters<Update>[1]) => selected.forEach(t => onUpdateTask(t.key, u))
  // All selected tasks move to the same date; the form compares against the earliest current one.
  const earliest = selected.map(t => t.due).sort()[0]

  return (
    <div role="toolbar" aria-label="Acciones para tareas seleccionadas"
      className="sticky bottom-3 z-30 mx-auto w-fit max-w-full flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 backdrop-blur shadow-lift px-3 py-2">
      <span className="text-sm font-semibold tabular-nums px-1">{n} seleccionada{n === 1 ? '' : 's'}</span>
      <select className={sel} value="" onChange={e => e.target.value && apply({ status: e.target.value as Status })} aria-label="Cambiar estatus">
        <option value="">Estatus…</option>{STATUSES.map(s => <option key={s}>{s}</option>)}
      </select>
      <select className={sel} value="" onChange={e => e.target.value && apply({ owner: e.target.value })} aria-label="Cambiar responsable">
        <option value="">Responsable…</option>{ALL_OWNERS.map(o => <option key={o}>{o}</option>)}
      </select>
      <select className={sel} value="" onChange={e => e.target.value && apply({ priority: e.target.value as Priority })} aria-label="Cambiar prioridad">
        <option value="">Prioridad…</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}
      </select>
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5"><CalendarClock className="h-3.5 w-3.5" />Mover fecha</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="center" side="top">
          {dateOpen && (
            <RescheduleForm current={earliest} label={`Nueva fecha compromiso para ${n} tarea${n === 1 ? '' : 's'}`} onCancel={() => setDateOpen(false)}
              onSave={(to, reason, note) => {
                selected.forEach(t => {
                  if (t.due === to) return
                  const r = to > t.due ? (reason === 'Se adelantó' ? 'Otro' : reason) : 'Se adelantó'
                  if (rs) rs.rescheduleTask(t.key, to, r, note); else onUpdateTask(t.key, { due: to })
                })
                setDateOpen(false)
              }} />
          )}
        </PopoverContent>
      </Popover>
      {agile && (
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => apply({ commitWeek: agile.week })}>
          <Target className="h-3.5 w-3.5" />Comprometer semana
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={onClear}><X className="h-3.5 w-3.5" />Quitar selección</Button>
    </div>
  )
}
