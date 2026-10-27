import { useMemo, useState } from 'react'
import {
  type View, type Filters, type Task, type Project, type TeamMember, type Health, type Status,
  STATUSES, STATUS_HEX, HEALTH_HEX, PROJECT_MAP, addDays, parseISO, fmtDate, firstName, dueLabel,
  findDataIssues, priorityStyle, displayName,
} from '../data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ring, StatusBar, Donut, HealthDot, PersonAvatar, OwnerStack } from './charts'
import { AlertTriangle, CalendarClock, FolderOpen, ListChecks, Info, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrendCard } from './TrendCard'
import { RiskCard } from './RiskCard'
import type { Risks } from '../risks'
import { RescheduleCard } from './RescheduleCard'
import { useReschedules } from '../reschedule'
import type { WeeklyMetric } from '../store'

interface Props {
  tasks: Task[]
  projects: Project[]
  team: TeamMember[]
  today: string
  metrics: WeeklyMetric[]
  risks: Risks
  onNavigate: (v: View, f?: Partial<Filters>) => void
  onSelectTask: (key: string) => void
  onSelectProject: (id: string) => void
}

const HEALTH_ORDER: Record<Health, number> = { 'Atrasado': 0, 'En riesgo': 1, 'En tiempo': 2, 'Completado': 3 }

export function Dashboard({ tasks, projects, team, today, metrics, risks, onNavigate, onSelectTask, onSelectProject }: Props) {
  const [day, setDay] = useState<string | null>(null)
  const rs = useReschedules()

  const open = tasks.filter(t => t.status !== 'Completado')
  const overdue = open.filter(t => t.health === 'Atrasado')
  const week = open.filter(t => t.daysLeft >= 0 && t.daysLeft <= 7)
  const activeProjects = projects.filter(p => p.status !== 'Completado')
  const withTasks = projects.filter(p => p.totalTasks > 0)
  const globalProgress = tasks.length ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / tasks.length) : 0
  const doneCount = tasks.length - open.length

  const statusCounts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map(s => [s, 0])) as Record<Status, number>
    tasks.forEach(t => c[t.status]++)
    return c
  }, [tasks])

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today])
  const byDay = useMemo(() => {
    const m: Record<string, Task[]> = {}
    open.forEach(t => { if (t.daysLeft >= 0 && t.daysLeft < 14) (m[t.due] ??= []).push(t) })
    return m
  }, [open])
  const maxDay = Math.max(1, overdue.length, ...days.map(d => byDay[d]?.length ?? 0))
  const dayTasks = day === 'overdue' ? overdue : day ? byDay[day] ?? [] : []

  const projectCards = activeProjects.filter(p => p.totalTasks > 0)
    .sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] || b.overdue - a.overdue)
  const attention = [...overdue].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8)
  const issues = useMemo(() => findDataIssues(tasks, projects), [tasks, projects])
  const maxLoad = Math.max(1, ...team.map(m => m.tasks))

  return (
    <div className="space-y-5 max-w-[1500px]">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Proyectos activos" value={activeProjects.length} sub={`${withTasks.length} con tareas · ${projects.length} total`}
          icon={FolderOpen} onClick={() => onNavigate('projects')}>
          <div className="flex gap-1 mt-2">
            {[...activeProjects].sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]).map(p => (
              <span key={p.id} title={`${p.name}: ${p.health}`} className="h-1.5 flex-1 rounded-full" style={{ background: HEALTH_HEX[p.health] }} />
            ))}
          </div>
        </Kpi>
        <Kpi label="Tareas abiertas" value={open.length} sub={`${doneCount} completadas de ${tasks.length}`} icon={ListChecks}
          onClick={() => onNavigate('tasks')} />
        <Kpi label="Atrasadas" value={overdue.length} sub={overdue.length ? `${Math.round(overdue.length / Math.max(open.length, 1) * 100)}% de lo abierto` : 'Todo al día'}
          icon={AlertTriangle} tone="red" onClick={() => onNavigate('tasks', { health: 'Atrasado' })} />
        <Kpi label="Vencen en 7 días" value={week.length} sub={`${week.filter(t => t.priority === 'Alta').length} de prioridad alta`}
          icon={CalendarClock} tone="amber" onClick={() => onNavigate('tasks', { health: 'En riesgo' })} />
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex items-center gap-4 h-full">
            <Ring value={globalProgress} size={64} stroke={7} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Avance global</p>
              <p className="text-xs text-muted-foreground mt-1">Promedio de {tasks.length} tareas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <TrendCard metrics={metrics} today={today} live={{ open: open.length, overdue: overdue.length, progress: globalProgress }} />

      {/* Next 14 days */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold">Vencimientos · próximos 14 días</CardTitle>
          <span className="text-[11px] text-muted-foreground">Haz clic en un día para ver sus tareas</span>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-1.5 min-w-[720px] items-end h-[120px]">
              <DayCol label="Vencidas" sub="" count={overdue.length} max={maxDay} color="#ef4444" active={day === 'overdue'}
                onClick={() => setDay(d => d === 'overdue' ? null : 'overdue')} wide />
              <div className="w-px self-stretch bg-border mx-1" />
              {days.map(d => {
                const list = byDay[d] ?? []
                const dt = parseISO(d)
                const weekend = dt.getDay() === 0 || dt.getDay() === 6
                const high = list.filter(t => t.priority === 'Alta').length
                return (
                  <DayCol key={d} label={d === today ? 'Hoy' : dt.toLocaleDateString('es-MX', { weekday: 'short' })}
                    sub={String(dt.getDate())} count={list.length} max={maxDay} highCount={high}
                    color={d === today ? '#f59e0b' : '#6366f1'} muted={weekend} active={day === d}
                    onClick={() => setDay(x => x === d ? null : d)} />
                )
              })}
            </div>
          </div>
          {day && (
            <div className="mt-3 border-t pt-3">
              <p className="text-xs font-semibold mb-2">
                {day === 'overdue' ? `${overdue.length} tareas vencidas` : `${dayTasks.length} tarea(s) · ${fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}`}
              </p>
              {dayTasks.length === 0 ? <p className="text-xs text-muted-foreground">Nada vence este día.</p> : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {dayTasks.map(t => <TaskChip key={t.key} t={t} onClick={() => onSelectTask(t.key)} />)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Project traffic light */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Semáforo de proyectos</CardTitle>
            <div className="flex gap-3 text-[11px] text-muted-foreground">
              {(['Atrasado', 'En riesgo', 'En tiempo'] as Health[]).map(h => (
                <span key={h} className="flex items-center gap-1"><HealthDot health={h} />{h} <b className="text-foreground">{projectCards.filter(p => p.health === h).length}</b></span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {projectCards.map(p => (
                <button key={p.id} onClick={() => onSelectProject(p.id)}
                  className="text-left rounded-xl border bg-card shadow-soft hover:shadow-lift hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-200 p-3.5 flex gap-3 border-l-4"
                  style={{ borderLeftColor: HEALTH_HEX[p.health] }}>
                  <Ring value={p.progress} size={46} stroke={5} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-semibold leading-snug line-clamp-2 flex-1">{p.name}</p>
                      <PersonAvatar name={p.owner} size="xs" />
                    </div>
                    <StatusBar counts={p.statusCounts} height={6} />
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">{p.completed}/{p.totalTasks} hechas</span>
                      {p.overdue > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">{p.overdue} atrasada{p.overdue > 1 ? 's' : ''}</span>}
                      {p.atRisk > 0 && <span className="text-amber-600 dark:text-amber-400">{p.atRisk} en riesgo</span>}
                      <span className={cn('ml-auto tabular-nums', p.daysToTarget < 0 && 'text-red-600 dark:text-red-400')}>
                        {p.daysToTarget < 0 ? `meta +${-p.daysToTarget}d` : `meta ${fmtDate(p.target)}`}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status donut */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Tareas por estatus</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Donut size={170} stroke={22}
              data={STATUSES.map(s => ({ label: s, value: statusCounts[s], color: STATUS_HEX[s] }))}
              onSelect={s => onNavigate('tasks', { status: s })}
              center={<><span className="text-3xl font-bold tabular-nums">{tasks.length}</span><span className="text-[11px] text-muted-foreground">tareas</span></>} />
            <div className="w-full space-y-1">
              {STATUSES.map(s => (
                <button key={s} onClick={() => onNavigate('tasks', { status: s })}
                  className="flex items-center gap-2 w-full text-sm px-2 py-1 rounded hover:bg-muted/60">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_HEX[s] }} />
                  <span className="flex-1 text-left">{s}</span>
                  <span className="tabular-nums font-semibold">{statusCounts[s]}</span>
                  <span className="tabular-nums text-xs text-muted-foreground w-9 text-right">{Math.round(statusCounts[s] / Math.max(tasks.length, 1) * 100)}%</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Team workload */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">Carga por persona</CardTitle>
            <button className="text-[11px] text-primary hover:underline" onClick={() => onNavigate('team')}>Ver vista Nosotros →</button>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...team].sort((a, b) => b.open - a.open).map(m => (
              <button key={m.name} onClick={() => onNavigate('tasks', { owner: m.name })}
                className="grid grid-cols-[150px_1fr_auto] items-center gap-3 w-full text-left group">
                <span className="flex items-center gap-2 min-w-0">
                  <PersonAvatar name={m.name} size="sm" />
                  <span className="text-sm font-medium truncate group-hover:text-primary">{displayName(m.name)}</span>
                </span>
                <span className="flex h-5 rounded overflow-hidden bg-muted" style={{ width: `${(m.tasks / maxLoad) * 100}%`, minWidth: 8 }}>
                  {STATUSES.filter(s => m.statusCounts[s] > 0).map(s => (
                    <span key={s} title={`${s}: ${m.statusCounts[s]}`} className="h-full flex items-center justify-center text-[10px] font-semibold text-white"
                      style={{ width: `${(m.statusCounts[s] / m.tasks) * 100}%`, background: STATUS_HEX[s] }}>
                      {m.statusCounts[s] / maxLoad > 0.06 ? m.statusCounts[s] : ''}
                    </span>
                  ))}
                </span>
                <span className="flex items-center gap-2 text-xs tabular-nums w-[120px] justify-end">
                  {m.overdue > 0 && <span className="text-red-600 dark:text-red-400 font-semibold">{m.overdue} tarde</span>}
                  <span className="text-muted-foreground">{m.open} abiertas</span>
                </span>
              </button>
            ))}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 pl-[162px]">
              {STATUSES.map(s => (
                <span key={s} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-sm" style={{ background: STATUS_HEX[s] }} />{s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attention */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Atención requerida
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {attention.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Sin tareas atrasadas</p> :
                attention.map(t => (
                  <button key={t.key} onClick={() => onSelectTask(t.key)}
                    className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-muted/60 text-left">
                    <span className="w-11 shrink-0 text-center rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[11px] font-bold tabular-nums py-0.5">
                      +{-t.daysLeft}d
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium truncate">{t.name}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{firstName(t.owner)} · {PROJECT_MAP[t.project]?.name}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              {overdue.length > attention.length && (
                <button className="text-xs text-primary hover:underline px-2 pt-1" onClick={() => onNavigate('tasks', { health: 'Atrasado' })}>
                  Ver las {overdue.length} atrasadas →
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className={cn('grid grid-cols-1 gap-5 items-start', issues.length > 0 ? 'lg:grid-cols-2 2xl:grid-cols-3' : 'lg:grid-cols-2')}>
        <RiskCard risks={risks} onSelectTask={onSelectTask} />

        <RescheduleCard reschedules={rs?.list ?? []} tasks={tasks} today={today} onSelectTask={onSelectTask} />

        {issues.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-500" /> Revisar datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {issues.map((i, n) => (
                <button key={n} disabled={!i.key && !i.project}
                  onClick={() => i.key ? onSelectTask(i.key) : i.project && onSelectProject(i.project)}
                  className="block w-full text-left text-xs text-muted-foreground px-2 py-1 rounded enabled:hover:bg-muted/60 enabled:hover:text-foreground">
                  • {i.text}
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, icon: Icon, tone, onClick, children }: {
  label: string; value: number | string; sub: string; icon: typeof AlertTriangle; tone?: 'red' | 'amber'; onClick?: () => void; children?: React.ReactNode
}) {
  const toneCls = tone === 'red' ? 'text-red-600 dark:text-red-400' : tone === 'amber' ? 'text-amber-600 dark:text-amber-400' : ''
  return (
    <Card className={cn('transition-colors', onClick && 'cursor-pointer hover:border-primary/40')} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <Icon className={cn('h-4 w-4 opacity-70', toneCls || 'text-primary')} />
        </div>
        <p className={cn('text-3xl font-bold tabular-nums tracking-tight mt-1', toneCls)}>{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
        {children}
      </CardContent>
    </Card>
  )
}

function DayCol({ label, sub, count, max, color, active, muted, wide, highCount = 0, onClick }: {
  label: string; sub: string; count: number; max: number; color: string; active: boolean; muted?: boolean; wide?: boolean; highCount?: number; onClick: () => void
}) {
  const h = count ? Math.max((count / max) * 70, 8) : 3
  return (
    <button onClick={onClick}
      className={cn('flex flex-col items-center justify-end gap-1 rounded-md pt-1 pb-1.5 transition-colors h-full',
        wide ? 'w-16' : 'flex-1', active ? 'bg-primary/10 ring-1 ring-primary/40' : 'hover:bg-muted/60', muted && !count && 'opacity-50')}>
      <span className="text-[11px] font-bold tabular-nums" style={{ color: count ? color : undefined }}>{count || ''}</span>
      <span className="w-[70%] rounded-sm relative overflow-hidden" style={{ height: h, background: count ? color : 'hsl(var(--muted))' }}>
        {highCount > 0 && <span className="absolute bottom-0 inset-x-0 bg-black/25" style={{ height: `${(highCount / count) * 100}%` }} />}
      </span>
      <span className={cn('text-[10px] leading-none capitalize', label === 'Hoy' ? 'font-bold text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{label}</span>
      {sub && <span className="text-[11px] font-semibold leading-none tabular-nums">{sub}</span>}
    </button>
  )
}

function TaskChip({ t, onClick }: { t: Task; onClick: () => void }) {
  const d = dueLabel(t)
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-md border p-2 text-left hover:bg-muted/50 border-l-4"
      style={{ borderLeftColor: HEALTH_HEX[t.health] }}>
      <OwnerStack owner={t.owner} coOwner={t.coOwner} size="xs" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium truncate">{t.name}</span>
        <span className="block text-[10px] text-muted-foreground truncate">{PROJECT_MAP[t.project]?.name}</span>
      </span>
      <Badge className={cn(priorityStyle(t.priority), 'border-0 text-[9px] px-1')}>{t.priority}</Badge>
      <span className={cn('text-[10px] tabular-nums', d.cls)}>{d.text}</span>
    </button>
  )
}
