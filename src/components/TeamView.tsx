import { useState } from 'react'
import { type Task, type TeamMember, type View, type Filters, HEALTH_HEX, PROJECT_MAP, dueLabel, STATUS_HEX } from '../data'
import { Card, CardContent } from '@/components/ui/card'
import { Ring, StatusBar, PersonAvatar } from './charts'
import { cn } from '@/lib/utils'
import { useAgile, WipBadge, commitStats, inProgressOf, DEFAULT_WIP } from '../agile'
import { addDays, fmtDate } from '../data'

interface Props {
  tasks: Task[]
  team: TeamMember[]
  onSelectTask: (key: string) => void
  onNavigate: (v: View, f?: Partial<Filters>) => void
}

export function TeamView({ tasks, team, onSelectTask, onNavigate }: Props) {
  const agile = useAgile()
  const limit = agile?.wipLimit ?? DEFAULT_WIP
  const week = agile?.week ?? ''
  const prevWeek = week ? addDays(week, -7) : ''
  const [showDone, setShowDone] = useState(false)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">Tareas abiertas de cada persona, de la más urgente a la menos urgente. Incluye las que tiene como corresponsable.</p>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} className="accent-primary" /> Mostrar completadas
        </label>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {team.map(m => {
          const mine = tasks.filter(t => (t.owner === m.name || t.coOwner === m.name) && (showDone || t.status !== 'Completado'))
            .sort((a, b) => (a.status === 'Completado' ? 1 : 0) - (b.status === 'Completado' ? 1 : 0) || a.daysLeft - b.daysLeft)
          const buckets = [
            { label: 'Atrasadas', n: m.overdue, c: HEALTH_HEX['Atrasado'] },
            { label: 'En riesgo', n: m.atRisk, c: HEALTH_HEX['En riesgo'] },
            { label: 'En tiempo', n: m.open - m.overdue - m.atRisk, c: HEALTH_HEX['En tiempo'] },
          ]
          return (
            <Card key={m.name} className="w-[300px] shrink-0 flex flex-col max-h-[calc(100vh-190px)]">
              <CardContent className="p-4 space-y-3 border-b">
                <button className="flex items-center gap-3 w-full text-left group" onClick={() => onNavigate('tasks', { owner: m.name })}>
                  <PersonAvatar name={m.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate group-hover:text-primary">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">{m.projects} proyecto(s) como owner · {m.tasks} tareas</p>
                  </div>
                  <Ring value={m.progress} size={46} stroke={5} />
                </button>
                <div className="grid grid-cols-3 gap-1.5">
                  {buckets.map(b => (
                    <div key={b.label} className="rounded-md py-1.5 text-center" style={{ background: `${b.c}1f` }}>
                      <p className="text-lg font-bold tabular-nums leading-none" style={{ color: b.n ? b.c : undefined }}>{b.n}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{b.label}</p>
                    </div>
                  ))}
                </div>
                <StatusBar counts={m.statusCounts} height={6} />
                {(() => {
                  const cur = commitStats(tasks, m.name, week), prev = commitStats(tasks, m.name, prevWeek)
                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <WipBadge count={inProgressOf(tasks, m.name)} limit={limit} />
                      <span title={`Compromiso semana del ${fmtDate(week)}`} className="text-[11px] font-semibold tabular-nums rounded px-1.5 py-0.5 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                        Semana {cur.done}/{cur.total}
                      </span>
                      {prev.total > 0 && <span className="text-[11px] text-muted-foreground tabular-nums">anterior {prev.done}/{prev.total}</span>}
                    </div>
                  )
                })()}
              </CardContent>
              <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
                {mine.map(t => {
                  const d = dueLabel(t)
                  return (
                    <button key={t.key} onClick={() => onSelectTask(t.key)}
                      className={cn('w-full text-left rounded-md border p-2 hover:bg-muted/50 border-l-4 transition-colors', t.status === 'Completado' && 'opacity-60')}
                      style={{ borderLeftColor: HEALTH_HEX[t.health] }}>
                      <p className="text-xs font-medium line-clamp-2">{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: STATUS_HEX[t.status] }} title={t.status} />
                        <span className="text-[10px] text-muted-foreground truncate flex-1">{PROJECT_MAP[t.project]?.name}{t.coOwner === m.name ? ' · corresp.' : ''}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{t.progress}%</span>
                        <span className={cn('text-[10px] tabular-nums', d.cls)}>{d.text}</span>
                      </div>
                    </button>
                  )
                })}
                {mine.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Sin tareas abiertas</p>}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
