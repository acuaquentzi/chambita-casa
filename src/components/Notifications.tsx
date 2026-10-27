import { useState, useMemo } from 'react'
import { type Task, PROJECT_MAP, firstName } from '../data'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Bell, AlertTriangle, Clock, XCircle, PauseCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  tasks: Task[]
  onSelectTask: (key: string) => void
}

type Kind = 'overdue' | 'soon' | 'blocked' | 'waiting'
const META: Record<Kind, { icon: typeof Bell; cls: string; label: string }> = {
  overdue: { icon: AlertTriangle, cls: 'text-red-500', label: 'Atrasadas' },
  blocked: { icon: XCircle, cls: 'text-red-500', label: 'Bloqueadas' },
  soon: { icon: Clock, cls: 'text-amber-500', label: 'Vencen pronto' },
  waiting: { icon: PauseCircle, cls: 'text-amber-500', label: 'En espera' },
}

export function Notifications({ tasks, onSelectTask }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Kind | 'all'>('all')
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const alerts = useMemo(() => tasks.flatMap(t => {
    if (t.status === 'Completado') return []
    const out: { id: string; kind: Kind; task: Task; msg: string }[] = []
    if (t.health === 'Atrasado') out.push({ id: `ov-${t.key}-${t.due}`, kind: 'overdue', task: t, msg: `${-t.daysLeft} días de atraso` })
    else if (t.health === 'En riesgo') out.push({ id: `so-${t.key}-${t.due}`, kind: 'soon', task: t, msg: t.daysLeft === 0 ? 'Vence hoy' : t.daysLeft === 1 ? 'Vence mañana' : `Vence en ${t.daysLeft} días` })
    if (t.status === 'Bloqueado') out.push({ id: `bl-${t.key}`, kind: 'blocked', task: t, msg: 'Bloqueada' })
    if (t.status === 'En espera' && t.health !== 'En tiempo') out.push({ id: `wa-${t.key}`, kind: 'waiting', task: t, msg: t.next || 'En espera' })
    return out
  }).filter(a => !dismissed.has(a.id)).sort((a, b) => a.task.daysLeft - b.task.daysLeft), [tasks, dismissed])

  const shown = tab === 'all' ? alerts : alerts.filter(a => a.kind === tab)
  const urgent = alerts.filter(a => a.kind === 'overdue' || a.kind === 'blocked').length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          {alerts.length > 0 && (
            <span className={cn('absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center tabular-nums', urgent ? 'bg-red-500' : 'bg-amber-500')}>
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Alertas</p>
          {alerts.length > 0 && <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDismissed(new Set([...dismissed, ...shown.map(a => a.id)]))}>Descartar visibles</Button>}
        </div>
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
          {(['all', 'overdue', 'soon', 'blocked', 'waiting'] as const).map(k => {
            const n = k === 'all' ? alerts.length : alerts.filter(a => a.kind === k).length
            return (
              <button key={k} onClick={() => setTab(k)} className={cn('text-[11px] px-2 py-1 rounded-full whitespace-nowrap border', tab === k ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}>
                {k === 'all' ? 'Todas' : META[k].label} {n}
              </button>
            )
          })}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {shown.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sin alertas</p> : shown.map(a => {
            const M = META[a.kind]
            return (
              <div key={a.id} className="group flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer border-b border-border/50"
                onClick={() => { onSelectTask(a.task.key); setOpen(false) }}>
                <M.icon className={cn('h-4 w-4 mt-0.5 shrink-0', M.cls)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.task.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{firstName(a.task.owner)} · {PROJECT_MAP[a.task.project]?.name}</p>
                  <p className={cn('text-[11px] font-semibold truncate', M.cls)}>{a.msg}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-muted" aria-label="Descartar"
                  onClick={e => { e.stopPropagation(); setDismissed(prev => new Set([...prev, a.id])) }}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
