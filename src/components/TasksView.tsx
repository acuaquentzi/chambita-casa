import { useMemo, useState } from 'react'
import { type Task, type Filters, type Health, PROJECT_MAP, HEALTH_HEX, STATUSES, STATUS_HEX, applyFilters } from '../data'
import { Card } from '@/components/ui/card'
import { FilterBar, Segmented } from './FilterBar'
import { StatusBar, PersonAvatar } from './charts'
import { InlineStatus, InlinePriority, InlineOwner, InlineProgress, InlineDue, type Update } from './inline'
import { ChevronDown, ChevronRight, MessageSquare, ArrowUpDown, Link2 } from 'lucide-react'
import { SlipBadge } from '../reschedule'
import { cn } from '@/lib/utils'
import { BulkBar } from './BulkBar'

interface Props {
  tasks: Task[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  onUpdateTask: Update
  onSelectTask: (key: string) => void
  lastComments?: Record<string, { text: string; at: string; author: string }>
}

type Group = 'project' | 'owner' | 'none'
type SortKey = 'due' | 'priority' | 'progress' | 'health' | 'id'
const PRI: Record<string, number> = { Alta: 0, Media: 1, Baja: 2 }
const HO: Record<Health, number> = { 'Atrasado': 0, 'En riesgo': 1, 'En tiempo': 2, 'Completado': 3 }
const GROUP_COLORS = ['#6366f1', '#0ea5e9', '#f97316', '#ec4899', '#14b8a6', '#8b5cf6', '#eab308', '#22c55e', '#ef4444']

const COLS = 'grid-cols-[30px_minmax(240px,2.4fr)_120px_120px_90px_150px_96px_minmax(160px,1.4fr)_36px]'

export function TasksView({ tasks, filters, setFilters, onUpdateTask, onSelectTask, lastComments = {} }: Props) {
  const [group, setGroup] = useState<Group>('project')
  const [sort, setSort] = useState<SortKey>('due')
  const [hideDone, setHideDone] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const toggle = (keys: string[], on: boolean) => setPicked(p => { const n = new Set(p); keys.forEach(k => on ? n.add(k) : n.delete(k)); return n })

  const data = useMemo(() => {
    const d = applyFilters(tasks, filters).filter(t => !hideDone || t.status !== 'Completado')
    const cmp: Record<SortKey, (a: Task, b: Task) => number> = {
      due: (a, b) => (a.status === 'Completado' ? 1 : 0) - (b.status === 'Completado' ? 1 : 0) || a.due.localeCompare(b.due),
      priority: (a, b) => PRI[a.priority] - PRI[b.priority],
      progress: (a, b) => b.progress - a.progress,
      health: (a, b) => HO[a.health] - HO[b.health],
      id: (a, b) => a.id.localeCompare(b.id),
    }
    return d.sort((a, b) => cmp[sort](a, b) || a.id.localeCompare(b.id))
  }, [tasks, filters, sort, hideDone])

  const groups = useMemo(() => {
    if (group === 'none') return [{ id: 'all', label: 'Todas las tareas', tasks: data, color: '#6366f1' }]
    const m = new Map<string, Task[]>()
    data.forEach(t => { const k = group === 'project' ? t.project : t.owner; m.set(k, [...(m.get(k) ?? []), t]) })
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([id, ts], i) => ({
      id, tasks: ts, color: GROUP_COLORS[i % GROUP_COLORS.length],
      label: group === 'project' ? `${id} · ${PROJECT_MAP[id]?.name ?? id}` : id,
    }))
  }, [data, group])

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} setFilters={setFilters} placeholder="Buscar tarea, ID o próximo paso…">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} className="accent-primary" /> Ocultar completadas
        </label>
        <Segmented value={group} onChange={setGroup} options={[{ v: 'project', l: 'Por proyecto' }, { v: 'owner', l: 'Por persona' }, { v: 'none', l: 'Lista' }]} />
      </FilterBar>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowUpDown className="h-3.5 w-3.5" /> Ordenar:
        {([['due', 'Compromiso'], ['health', 'Salud'], ['priority', 'Prioridad'], ['progress', 'Avance'], ['id', 'ID']] as [SortKey, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setSort(k)} className={cn('px-2 py-0.5 rounded-full border', sort === k ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>{l}</button>
        ))}
        <span className="ml-auto tabular-nums">{data.length} tareas</span>
      </div>

      <div className="space-y-5">
        {groups.map(g => {
          const isCol = collapsed[g.id]
          const counts = Object.fromEntries(STATUSES.map(s => [s, g.tasks.filter(t => t.status === s).length])) as any
          const avg = g.tasks.length ? Math.round(g.tasks.reduce((s, t) => s + t.progress, 0) / g.tasks.length) : 0
          const late = g.tasks.filter(t => t.health === 'Atrasado').length
          return (
            <section key={g.id}>
              <button onClick={() => setCollapsed(c => ({ ...c, [g.id]: !c[g.id] }))} className="flex items-center gap-2 mb-1.5 group w-full text-left">
                {isCol ? <ChevronRight className="h-4 w-4" style={{ color: g.color }} /> : <ChevronDown className="h-4 w-4" style={{ color: g.color }} />}
                {group === 'owner' && <PersonAvatar name={g.id} size="xs" />}
                <span className="text-sm font-bold" style={{ color: g.color }}>{g.label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{g.tasks.length} tareas · {avg}%</span>
                {late > 0 && <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{late} atrasada{late > 1 ? 's' : ''}</span>}
                <StatusBar counts={counts} height={6} className="w-32 ml-2 hidden sm:block" />
              </button>
              {!isCol && (
                <Card className="overflow-hidden border-l-4" style={{ borderLeftColor: g.color }}>
                  <div className="overflow-x-auto">
                    <div className="min-w-[1080px]">
                      <div className={cn('grid gap-3 items-center px-3 py-2 border-b bg-muted/40 text-[11px] font-medium uppercase tracking-wide text-muted-foreground', COLS)}>
                        <input type="checkbox" className="accent-primary h-4 w-4 cursor-pointer" aria-label="Seleccionar todas las del grupo"
                          checked={g.tasks.length > 0 && g.tasks.every(t => picked.has(t.key))}
                          ref={el => { if (el) el.indeterminate = g.tasks.some(t => picked.has(t.key)) && !g.tasks.every(t => picked.has(t.key)) }}
                          onChange={e => toggle(g.tasks.map(t => t.key), e.target.checked)} />
                        <span>Tarea</span><span>Responsable</span><span>Estatus</span><span>Prioridad</span><span>Avance</span><span>Compromiso</span><span>Último comentario</span><span />
                      </div>
                      {g.tasks.map(t => (
                        <div key={t.key} onClick={() => onSelectTask(t.key)}
                          className={cn('grid gap-3 items-center px-3 py-1.5 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer text-sm', COLS, t.status === 'Completado' && 'opacity-60', picked.has(t.key) && 'bg-primary/[0.06] hover:bg-primary/10')}>
                          <span className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="accent-primary h-4 w-4 cursor-pointer" aria-label={`Seleccionar ${t.id}`}
                              checked={picked.has(t.key)} onChange={e => toggle([t.key], e.target.checked)} />
                            <span className="h-7 w-1.5 rounded-full shrink-0" style={{ background: HEALTH_HEX[t.health] }} title={t.health} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">{t.id}</span>
                              <span className={cn('truncate font-medium', t.status === 'Completado' && 'line-through decoration-muted-foreground/50')}>{t.name}</span>
                              {t.dependsOn?.length ? <Link2 className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Tiene dependencias" /> : null}
                              <SlipBadge refKey={t.key} />
                            </span>
                            {group !== 'project' && <span className="block text-[11px] text-muted-foreground truncate">{PROJECT_MAP[t.project]?.name}</span>}
                          </span>
                          <span className="flex items-center gap-1 min-w-0">
                            <InlineOwner task={t} onUpdate={onUpdateTask} />
                            {t.coOwner && <PersonAvatar name={t.coOwner} size="xs" />}
                          </span>
                          <InlineStatus task={t} onUpdate={onUpdateTask} solid />
                          <InlinePriority task={t} onUpdate={onUpdateTask} />
                          <InlineProgress task={t} onUpdate={onUpdateTask} />
                          <InlineDue task={t} onUpdate={onUpdateTask} />
                          <span className="min-w-0 leading-tight">
                            {lastComments[t.key] ? (
                              <span className="block text-xs truncate" title={lastComments[t.key].text}>
                                <b className="font-semibold">{lastComments[t.key].author.split(' ')[0]}:</b> {lastComments[t.key].text}
                                <span className="text-muted-foreground"> · {new Date(lastComments[t.key].at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                              </span>
                            ) : <span className="block text-xs text-muted-foreground/70">Sin comentarios</span>}
                            {t.next && <span className="block text-[11px] text-muted-foreground truncate mt-0.5" title={t.next}>↳ {t.next}</span>}
                          </span>
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </section>
          )
        })}
        {data.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No hay tareas con estos filtros.</p>}
      </div>
      {picked.size > 0 && (
        <BulkBar selected={tasks.filter(t => picked.has(t.key))} onUpdateTask={onUpdateTask} onClear={() => setPicked(new Set())} />
      )}
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {STATUSES.map(s => <span key={s} className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: STATUS_HEX[s] }} />{s}</span>)}
        <span className="mx-2">|</span>
        {(Object.keys(HEALTH_HEX) as Health[]).map(h => <span key={h} className="flex items-center gap-1"><span className="h-2.5 w-1 rounded-full" style={{ background: HEALTH_HEX[h] }} />{h}</span>)}
      </div>
    </div>
  )
}
