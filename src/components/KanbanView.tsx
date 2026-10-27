import { useMemo, useRef, useState } from 'react'
import { type Task, type Status, type Filters, STATUSES, STATUS_HEX, HEALTH_HEX, PROJECT_MAP, applyFilters, dueLabel, priorityStyle } from '../data'
import { Badge } from '@/components/ui/badge'
import { FilterBar } from './FilterBar'
import { OwnerStack } from './charts'
import type { Update } from './inline'
import { ArrowRight, CornerDownRight } from 'lucide-react'
import { SlipBadge } from '../reschedule'
import { cn } from '@/lib/utils'
import { useAgile, DEFAULT_WIP } from '../agile'

interface Props {
  tasks: Task[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  onUpdateTask: Update
  onSelectTask: (key: string) => void
}

const ORDER: Status[] = ['No iniciado', 'En curso', 'En espera', 'Bloqueado', 'Completado']

export function KanbanView({ tasks, filters, setFilters, onUpdateTask, onSelectTask }: Props) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<Status | null>(null)
  const [showDone, setShowDone] = useState(false)
  const agile = useAgile()
  const limit = agile?.wipLimit ?? DEFAULT_WIP
  const overWip: string[] = []
  const dragRef = useRef<string | null>(null)

  const columns = useMemo(() => {
    const map = Object.fromEntries(STATUSES.map(s => [s, [] as Task[]])) as Record<Status, Task[]>
    applyFilters(tasks, { ...filters, status: '' }).forEach(t => map[t.status].push(t))
    Object.values(map).forEach(l => l.sort((a, b) => a.daysLeft - b.daysLeft))
    return map
  }, [tasks, filters])

  const drop = (status: Status) => {
    if (dragRef.current) onUpdateTask(dragRef.current, { status })
    dragRef.current = null; setDragging(null); setOver(null)
  }

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} setFilters={setFilters} fields={['search', 'project', 'owner', 'priority', 'health']} placeholder="Buscar tarjeta…">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} className="accent-primary" /> Mostrar completadas
        </label>
      </FilterBar>
      <p className="text-[11px] text-muted-foreground">Arrastra una tarjeta a otra columna para cambiar su estatus, o usa la flecha para avanzarla.</p>

      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '65vh' }}>
        {ORDER.map(status => {
          const items = columns[status]
          const late = items.filter(t => t.health === 'Atrasado').length
          const next = ORDER[ORDER.indexOf(status) + 1]
          if (status === 'Completado' && !showDone) return (
            <button key={status} onClick={() => setShowDone(true)} title="Mostrar completadas"
              onDragOver={e => { e.preventDefault(); setOver(status) }}
              onDragLeave={() => setOver(null)}
              onDrop={e => { e.preventDefault(); drop(status) }}
              className={cn('flex-shrink-0 w-14 rounded-xl flex flex-col items-center gap-2 py-3 text-white transition-shadow', over === status && 'ring-2 ring-primary/60')}
              style={{ background: STATUS_HEX[status] }}>
              <span className="text-xs font-bold tabular-nums bg-white/25 rounded-full px-2">{items.length}</span>
              <span className="text-xs font-semibold [writing-mode:vertical-rl] rotate-180">Completado · suelta aquí</span>
            </button>
          )
          return (
            <div key={status}
              className={cn('flex-shrink-0 w-[290px] rounded-xl flex flex-col transition-colors', over === status ? 'bg-primary/10 ring-2 ring-primary/40' : 'bg-muted/50')}
              onDragOver={e => { e.preventDefault(); setOver(status) }}
              onDragLeave={() => setOver(null)}
              onDrop={e => { e.preventDefault(); drop(status) }}>
              <div className="rounded-t-xl px-3 py-2.5 flex items-center gap-2 text-white" style={{ background: STATUS_HEX[status] }}>
                <span className="text-sm font-semibold">{status}</span>
                {status === 'En curso' && overWip.length > 0 && (
                  <span title={`Sobre el límite de ${limit}: ${overWip.join(', ')}`} className="text-[10px] font-semibold bg-red-600/90 rounded px-1.5 py-0.5">
                    {overWip.length} sobre límite
                  </span>
                )}
                <span className="text-xs font-bold tabular-nums bg-white/25 rounded-full px-2">{items.length}</span>
                {late > 0 && status !== 'Completado' && <span className="ml-auto text-[10px] font-semibold bg-black/20 rounded px-1.5 py-0.5">{late} tarde</span>}
              </div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
                {items.map(t => {
                  const d = dueLabel(t)
                  return (
                    <div key={t.key} draggable
                      onDragStart={() => { dragRef.current = t.key; setDragging(t.key) }}
                      onDragEnd={() => { setDragging(null); setOver(null) }}
                      onClick={() => onSelectTask(t.key)}
                      className={cn('group rounded-lg border bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all border-l-4',
                        dragging === t.key && 'opacity-40')}
                      style={{ borderLeftColor: HEALTH_HEX[t.health] }}>
                      <div className="flex items-start gap-2">
                        <p className="text-[13px] font-medium leading-snug flex-1 line-clamp-3">{t.name}</p>
                        <Badge className={cn(priorityStyle(t.priority), 'border-0 text-[10px] shrink-0')}>{t.priority}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{t.id} · {PROJECT_MAP[t.project]?.name}</span><SlipBadge refKey={t.key} />
                      </p>
                      {t.next && status !== 'Completado' && (
                        <p className="text-[11px] text-muted-foreground flex gap-1 line-clamp-2"><CornerDownRight className="h-3 w-3 shrink-0 mt-0.5" />{t.next}</p>
                      )}
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${t.progress}%`, background: STATUS_HEX[t.status] }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <OwnerStack owner={t.owner} coOwner={t.coOwner} size="xs" />
                        <span className="text-[11px] text-muted-foreground tabular-nums">{t.progress}%</span>
                        <span className={cn('ml-auto text-[11px] tabular-nums rounded px-1.5 py-0.5', d.cls, t.health === 'Atrasado' && 'bg-red-100 dark:bg-red-900/40')}>{d.text}</span>
                        {next && (
                          <button onClick={e => { e.stopPropagation(); onUpdateTask(t.key, { status: next }) }}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-0.5 hover:bg-muted transition-opacity" title={`Mover a ${next}`} aria-label={`Mover a ${next}`}>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Suelta tarjetas aquí</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
