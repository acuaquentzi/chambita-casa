import { useMemo } from 'react'
import { type Task, type Reschedule, isSlip, addDays, daysBetween, firstName } from '../data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarClock } from 'lucide-react'

interface Props {
  reschedules: Reschedule[]
  tasks: Task[]
  today: string
  onSelectTask: (key: string) => void
}

export function RescheduleCard({ reschedules, tasks, today, onSelectTask }: Props) {
  const since = addDays(today, -30)
  const { slips, byReason, top, days, projectMoves } = useMemo(() => {
    const recent = reschedules.filter(r => isSlip(r) && r.at.slice(0, 10) >= since)
    const slips = recent.filter(r => r.kind === 'task')
    const reasons: Record<string, number> = {}
    slips.forEach(r => { reasons[r.reason] = (reasons[r.reason] ?? 0) + 1 })
    const perTask: Record<string, { n: number; days: number }> = {}
    slips.forEach(r => {
      const x = (perTask[r.ref] ??= { n: 0, days: 0 })
      x.n += 1; x.days += daysBetween(r.from, r.to)
    })
    const byKey = Object.fromEntries(tasks.map(t => [t.key, t]))
    const top = Object.entries(perTask).filter(([k]) => byKey[k]).sort((a, b) => b[1].n - a[1].n || b[1].days - a[1].days)
      .slice(0, 3).map(([k, v]) => ({ task: byKey[k], ...v }))
    return {
      slips,
      byReason: Object.entries(reasons).sort((a, b) => b[1] - a[1]),
      top,
      days: slips.reduce((s, r) => s + daysBetween(r.from, r.to), 0),
      projectMoves: recent.filter(r => r.kind === 'project').length,
    }
  }, [reschedules, tasks, since])

  const max = Math.max(1, ...byReason.map(([, n]) => n))
  const affected = new Set(slips.map(r => r.ref)).size

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-amber-500" /> Fechas movidas · últimos 30 días
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {slips.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Todavía nadie ha reprogramado una fecha desde la plataforma. Cuando alguien atrase un compromiso, aquí verás cuántas veces y por qué.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/60 py-1.5"><p className="text-lg font-bold tabular-nums">{slips.length}</p><p className="text-[10px] text-muted-foreground">reprogramaciones</p></div>
              <div className="rounded-md bg-muted/60 py-1.5"><p className="text-lg font-bold tabular-nums">{affected}</p><p className="text-[10px] text-muted-foreground">tareas</p></div>
              <div className="rounded-md bg-muted/60 py-1.5"><p className="text-lg font-bold tabular-nums">{days}</p><p className="text-[10px] text-muted-foreground">días sumados</p></div>
            </div>
            <div className="space-y-1.5">
              {byReason.map(([reason, n]) => (
                <div key={reason} className="grid grid-cols-[1fr_auto] gap-2 items-center text-xs" title={`${reason}: ${n}`}>
                  <div className="min-w-0">
                    <p className="truncate">{reason}</p>
                    <div className="h-1.5 rounded-full bg-muted mt-0.5 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${(n / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="tabular-nums font-semibold">{n}</span>
                </div>
              ))}
            </div>
            {top.length > 0 && (
              <div className="pt-1 border-t space-y-0.5">
                <p className="text-[11px] text-muted-foreground pt-2">Las que más se mueven</p>
                {top.map(({ task, n, days: d }) => (
                  <button key={task.key} onClick={() => onSelectTask(task.key)} className="flex items-center gap-2 w-full text-left text-xs rounded px-1 py-1 hover:bg-muted/60">
                    <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400 w-8">{n}×</span>
                    <span className="truncate flex-1">{task.name}</span>
                    <span className="text-muted-foreground shrink-0">{firstName(task.owner)} · +{d}d</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {projectMoves > 0 && <p className="text-[11px] text-muted-foreground">Además, {projectMoves} meta{projectMoves === 1 ? '' : 's'} de proyecto movida{projectMoves === 1 ? '' : 's'}.</p>}
      </CardContent>
    </Card>
  )
}
