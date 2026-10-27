import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useReschedules, RescheduleForm, RescheduleHistory, SlipBadge } from '../reschedule'
import { LinksEditor } from './LinksEditor'
import {
  type Task, type Project, type ProjectMeta, type Comment, type Activity, type Status, type Priority, STATUS_HEX, HEALTH_HEX, STATUSES, PRIORITIES, ALL_OWNERS,
  statusStyle, healthStyle, priorityStyle, daysBetween, fmtDate,
} from '../data'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Ring, StatusBar, PersonAvatar } from './charts'
import { InlineStatus, InlineOwner, InlineProgress, InlineDue, type Update } from './inline'
import { cn } from '@/lib/utils'

interface Props {
  project: Project
  tasks: Task[]
  today: string
  onClose: () => void
  onUpdateTask: Update
  onUpdateProject: (id: string, updates: Partial<ProjectMeta>) => void
  onAddTask: () => void
  comments: Comment[]
  activity: Activity[]
  nameFor: (id: string | null) => string
  onSelectTask: (key: string) => void
}

function DateTile({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="rounded-lg border px-3 py-2 hover:bg-muted/50 cursor-pointer block">
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input type="date" value={value} aria-label={label}
        onChange={e => /^20\d\d-/.test(e.target.value) && onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-bold tabular-nums focus:outline-none" />
      <span className="sr-only">{fmtDate(value)}</span>
    </label>
  )
}

function TargetTile({ project: p, onFallback }: { project: Project; onFallback: (v: string) => void }) {
  const api = useReschedules()
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="rounded-lg border px-3 py-2 hover:bg-muted/50 text-left" aria-label="Reprogramar meta del proyecto">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Meta <SlipBadge kind="project" refKey={p.id} /></span>
          <span className="block text-sm font-bold tabular-nums">{fmtDate(p.target, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        {open && (
          <RescheduleForm current={p.target} label={`Reprogramar meta de ${p.id}`} onCancel={() => setOpen(false)}
            onSave={(to, reason, note) => { if (api) api.rescheduleProject(p.id, to, reason, note); else onFallback(to); setOpen(false) }} />
        )}
        <RescheduleHistory kind="project" refKey={p.id} className="mt-3 pt-3 border-t" />
      </PopoverContent>
    </Popover>
  )
}

export function ProjectDetail({ project: p, tasks, today, onClose, onUpdateTask, onUpdateProject, onAddTask, onSelectTask }: Props) {
  const pt = useMemo(() => tasks.filter(t => t.project === p.id).sort((a, b) => a.start.localeCompare(b.start)), [tasks, p.id])
  const range = useMemo(() => {
    let s = p.start, e = p.target
    pt.forEach(t => { if (t.start < s) s = t.start; if (t.due > e) e = t.due })
    if (today > e) e = today
    return { s, e, total: Math.max(daysBetween(s, e), 1) }
  }, [pt, p, today])
  const pos = (iso: string) => `${(daysBetween(range.s, iso) / range.total) * 100}%`
  const span = (a: string, b: string) => `${Math.max((daysBetween(a, b) + 1) / range.total * 100, 1)}%`

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4 flex-wrap pr-6">
            <Ring value={p.progress} size={64} stroke={7} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">{p.id}</p>
              <DialogTitle className="sr-only">{p.name}</DialogTitle>
              <input key={p.name} defaultValue={p.name} aria-label="Nombre del proyecto"
                onBlur={e => { const v = e.target.value.trim(); if (v && v !== p.name) onUpdateProject(p.id, { name: v }) }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                className="w-full bg-transparent text-lg font-semibold leading-snug rounded px-1 -mx-1 hover:bg-muted focus:bg-muted focus:outline-none" />
              <DialogDescription asChild>
                <div className="mt-1">
                  <Select value={p.owner} onValueChange={v => onUpdateProject(p.id, { owner: v })}>
                    <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent px-1 -mx-1 text-xs shadow-none hover:bg-muted" aria-label="Owner del proyecto">
                      <PersonAvatar name={p.owner} size="xs" /><SelectValue />
                    </SelectTrigger>
                    <SelectContent>{ALL_OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </DialogDescription>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              <Select value={p.status} onValueChange={v => onUpdateProject(p.id, { status: v as Status })}>
                <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none [&>svg]:hidden" aria-label="Estatus del proyecto">
                  <Badge className={cn(statusStyle(p.status), 'border-0 cursor-pointer')}>{p.status} ▾</Badge>
                </SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={p.priority} onValueChange={v => onUpdateProject(p.id, { priority: v as Priority })}>
                <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none [&>svg]:hidden" aria-label="Prioridad del proyecto">
                  <Badge className={cn(priorityStyle(p.priority), 'border-0 cursor-pointer')}>{p.priority} ▾</Badge>
                </SelectTrigger>
                <SelectContent>{PRIORITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Badge className={cn(healthStyle(p.health), 'border-0')}>{p.health}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <DateTile label="Inicio" value={p.start} onChange={v => onUpdateProject(p.id, { start: v })} />
          <TargetTile project={p} onFallback={v => onUpdateProject(p.id, { target: v })} />
          {[
            [p.daysToTarget < 0 ? 'Meta vencida' : 'Faltan', p.daysToTarget < 0 ? `${-p.daysToTarget} días` : `${p.daysToTarget} días`, p.daysToTarget < 0 && p.health !== 'Completado' ? 'text-red-600 dark:text-red-400' : ''],
            ['Completadas', `${p.completed} / ${p.totalTasks}`, 'text-emerald-600 dark:text-emerald-400'],
            ['Atrasadas', String(p.overdue), p.overdue ? 'text-red-600 dark:text-red-400' : ''],
          ].map(([l, v, c]) => (
            <div key={l} className="rounded-lg border px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
              <p className={cn('text-sm font-bold tabular-nums', c)}>{v}</p>
            </div>
          ))}
        </div>
        {p.status === 'Completado' && p.open > 0 && (
          <p className="text-xs rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-3 py-2">
            El proyecto está marcado Completado pero tiene {p.open} tarea(s) abierta(s).
          </p>
        )}
        <StatusBar counts={p.statusCounts} height={10} showLegend />
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Documentos del proyecto</p>
          <LinksEditor links={p.links ?? []} onChange={links => onUpdateProject(p.id, { links })} />
        </div>

        {pt.length > 0 && (
          <div className="border rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
              <span>{fmtDate(range.s)}</span><span className="font-semibold">Timeline</span><span>{fmtDate(range.e)}</span>
            </div>
            <div className="relative space-y-1">
              <div className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10" style={{ left: pos(today) }} title="Hoy" />
              <div className="absolute top-0 bottom-0 border-l-2 border-dashed z-10" style={{ left: pos(p.target), borderColor: HEALTH_HEX[p.health] }} title="Meta" />
              {pt.map(t => (
                <button key={t.key} onClick={() => onSelectTask(t.key)} className="relative h-5 w-full block group" title={`${t.name} · ${t.progress}%`}>
                  <span className="absolute top-0.5 h-4 rounded overflow-hidden group-hover:ring-2 ring-primary/50"
                    style={{ left: pos(t.start), width: span(t.start, t.due), background: `${STATUS_HEX[t.status]}40` }}>
                    <span className="absolute inset-y-0 left-0" style={{ width: `${t.progress}%`, background: STATUS_HEX[t.status] }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="w-1.5" />
                <th className="text-left px-3 py-2 font-medium">Tarea</th>
                <th className="text-left px-3 py-2 font-medium">Responsable</th>
                <th className="text-left px-3 py-2 font-medium">Estatus</th>
                <th className="text-left px-3 py-2 font-medium w-36">Avance</th>
                <th className="text-left px-3 py-2 font-medium">Compromiso</th>
              </tr>
            </thead>
            <tbody>
              {pt.map(t => (
                <tr key={t.key} className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer" onClick={() => onSelectTask(t.key)}>
                  <td><span className="block h-6 w-1.5 rounded-full ml-1" style={{ background: HEALTH_HEX[t.health] }} /></td>
                  <td className="px-3 py-1.5 max-w-[300px]">
                    <span className="block truncate font-medium"><span className="text-muted-foreground mr-1">{t.id}</span>{t.name}</span>
                    {t.next && <span className="block truncate text-[11px] text-muted-foreground">→ {t.next}</span>}
                  </td>
                  <td className="px-3 py-1.5"><InlineOwner task={t} onUpdate={onUpdateTask} /></td>
                  <td className="px-3 py-1.5"><InlineStatus task={t} onUpdate={onUpdateTask} /></td>
                  <td className="px-3 py-1.5"><InlineProgress task={t} onUpdate={onUpdateTask} /></td>
                  <td className="px-3 py-1.5"><InlineDue task={t} onUpdate={onUpdateTask} /></td>
                </tr>
              ))}
              {pt.length === 0 && <tr><td colSpan={6} className="text-center text-muted-foreground py-6">Este proyecto aún no tiene tareas.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onAddTask}><Plus className="h-4 w-4" />Agregar tarea</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
