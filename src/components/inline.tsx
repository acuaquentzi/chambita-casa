import { useEffect, useState } from 'react'
import { type Task, type BaseTask, type Status, type Priority, STATUSES, PRIORITIES, ALL_OWNERS, STATUS_HEX, statusStyle, priorityStyle, progressColor, dueLabel, fmtDate } from '../data'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { PersonAvatar } from './charts'
import { useReschedules, RescheduleForm, RescheduleHistory, SlipBadge } from '../reschedule'
import { cn } from '@/lib/utils'

export type Update = (key: string, updates: Partial<BaseTask>) => void

const Stop = ({ children }: { children: React.ReactNode }) => <span className="contents" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>{children}</span>

const bare = 'h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 focus:ring-offset-0 [&>svg]:hidden'

export function InlineStatus({ task, onUpdate, solid }: { task: Task; onUpdate?: Update; solid?: boolean }) {
  const badge = solid
    ? <span className="inline-flex items-center justify-center min-w-[96px] h-7 px-2 rounded text-[11px] font-semibold text-white" style={{ background: STATUS_HEX[task.status] }}>{task.status}</span>
    : <Badge className={cn(statusStyle(task.status), 'border-0 text-[11px] whitespace-nowrap')}>{task.status}</Badge>
  if (!onUpdate) return badge
  return (
    <Stop><Select value={task.status} onValueChange={v => onUpdate(task.key, { status: v as Status })}>
      <SelectTrigger className={cn(bare, 'hover:opacity-85')} onClick={e => e.stopPropagation()} aria-label="Cambiar estatus">{badge}</SelectTrigger>
      <SelectContent>
        {STATUSES.map(s => (
          <SelectItem key={s} value={s}><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_HEX[s] }} />{s}</span></SelectItem>
        ))}
      </SelectContent>
    </Select></Stop>
  )
}

export function InlinePriority({ task, onUpdate }: { task: Task; onUpdate?: Update }) {
  const badge = <Badge className={cn(priorityStyle(task.priority), 'border-0 text-[11px]')}>{task.priority}</Badge>
  if (!onUpdate) return badge
  return (
    <Stop><Select value={task.priority} onValueChange={v => onUpdate(task.key, { priority: v as Priority })}>
      <SelectTrigger className={cn(bare, 'hover:opacity-85')} onClick={e => e.stopPropagation()} aria-label="Cambiar prioridad">{badge}</SelectTrigger>
      <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
    </Select></Stop>
  )
}

export function InlineOwner({ task, onUpdate, field = 'owner', showName = true }: { task: Task; onUpdate?: Update; field?: 'owner' | 'coOwner'; showName?: boolean }) {
  const name = task[field]
  const face = name
    ? <div className="flex items-center gap-1.5 min-w-0"><PersonAvatar name={name} size="xs" />{showName && <div className="text-xs truncate">{name.split(' ')[0]}</div>}</div>
    : <div className="text-xs text-muted-foreground">+ agregar</div>
  if (!onUpdate) return face
  return (
    <Stop><Select value={name || '__none'} onValueChange={v => onUpdate(task.key, { [field]: v === '__none' ? '' : v })}>
      <SelectTrigger className={cn(bare, 'rounded px-1 -mx-1 hover:bg-muted')} onClick={e => e.stopPropagation()} aria-label="Cambiar responsable">{face}</SelectTrigger>
      <SelectContent>
        {field === 'coOwner' && <SelectItem value="__none">Sin corresponsable</SelectItem>}
        {ALL_OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select></Stop>
  )
}

export function InlineProgress({ task, onUpdate, wide }: { task: Task; onUpdate?: Update; wide?: boolean }) {
  const [v, setV] = useState(task.progress)
  useEffect(() => setV(task.progress), [task.progress])
  const bar = (
    <span className={cn('flex items-center gap-2', wide ? 'w-full' : 'w-[120px]')}>
      <span className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <span className={cn('block h-full rounded-full transition-all', progressColor(v))} style={{ width: `${v}%` }} />
      </span>
      <span className="text-xs tabular-nums w-8 text-right font-semibold">{v}%</span>
    </span>
  )
  if (!onUpdate) return bar
  return (
    <Stop><Popover>
      <PopoverTrigger asChild>
        <button className="rounded px-1 -mx-1 py-1 hover:bg-muted w-full" onClick={e => e.stopPropagation()} aria-label="Cambiar avance">{bar}</button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" align="start" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-medium mb-3">Avance: <b className="tabular-nums">{v}%</b></p>
        <Slider value={[v]} onValueChange={([x]) => setV(x)} onValueCommit={([x]) => onUpdate(task.key, { progress: x })} max={100} step={5} />
        <div className="flex justify-between gap-1 mt-3">
          {[0, 25, 50, 75, 100].map(p => (
            <button key={p} className={cn('text-[11px] flex-1 rounded border py-1 hover:bg-muted', v === p && 'bg-primary text-primary-foreground border-primary')}
              onClick={() => { setV(p); onUpdate(task.key, { progress: p }) }}>{p}%</button>
          ))}
        </div>
      </PopoverContent>
    </Popover></Stop>
  )
}

export function InlineDue({ task, onUpdate, onRescheduled, large }: { task: Task; onUpdate?: Update; onRescheduled?: () => void; large?: boolean }) {
  const api = useReschedules()
  const [open, setOpen] = useState(false)
  const d = dueLabel(task)
  const face = large ? (
    <span className="flex items-center gap-2">
      <span className="text-sm tabular-nums">{fmtDate(task.due, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      <span className={cn('text-xs tabular-nums', d.cls)}>{d.text}</span>
      <SlipBadge refKey={task.key} />
    </span>
  ) : (
    <span className="flex flex-col items-start leading-tight">
      <span className="text-xs tabular-nums">{fmtDate(task.due, { day: 'numeric', month: 'short' })}</span>
      <span className={cn('text-[10px] tabular-nums', d.cls)}>{d.text}</span>
    </span>
  )
  if (!onUpdate) return face
  return (
    <Stop><Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn('rounded hover:bg-muted', large ? 'border px-2.5 h-9' : 'px-1 -mx-1 py-0.5')} onClick={e => e.stopPropagation()} aria-label="Reprogramar fecha compromiso">{face}</button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start" onClick={e => e.stopPropagation()}>
        {open && (
          <RescheduleForm current={task.due} label={`Reprogramar ${task.id}`} onCancel={() => setOpen(false)}
            onSave={(to, reason, note) => {
              if (api) api.rescheduleTask(task.key, to, reason, note)
              else onUpdate(task.key, { due: to })
              setOpen(false)
              onRescheduled?.()
            }} />
        )}
        <RescheduleHistory kind="task" refKey={task.key} className="mt-3 pt-3 border-t" />
      </PopoverContent>
    </Popover></Stop>
  )
}
