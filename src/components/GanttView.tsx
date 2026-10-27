import { useEffect, useMemo, useRef, useState } from 'react'
import { type Task, type Project, type Filters, STATUS_HEX, HEALTH_HEX, PROJECT_MAP, applyFilters, addDays, daysBetween, parseISO, fmtDate, firstName, statusStyle } from '../data'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FilterBar, Segmented } from './FilterBar'
import { PersonAvatar } from './charts'
import { ChevronDown, ChevronRight, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  tasks: Task[]
  projects: Project[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  today: string
  onSelectTask: (key: string) => void
}

type Zoom = 'week' | 'month' | 'quarter'
const PX: Record<Zoom, number> = { week: 22, month: 7, quarter: 2.6 }
const LABEL_W = 280
const HEAD_H = 44
const GROUP_H = 34
const ROW_H = 32
const MAX_BACK = 120

export function GanttView({ tasks, projects, filters, setFilters, today, onSelectTask }: Props) {
  const [zoom, setZoom] = useState<Zoom>('month')
  const [openOnly, setOpenOnly] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const px = PX[zoom]

  const filtered = useMemo(() => applyFilters(tasks, filters).filter(t => !openOnly || t.status !== 'Completado'), [tasks, filters, openOnly])
  const grouped = useMemo(() => {
    const m = new Map<string, Task[]>()
    filtered.forEach(t => m.set(t.project, [...(m.get(t.project) ?? []), t]))
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([pid, ts]) => ({ pid, project: projects.find(p => p.id === pid)!, tasks: ts.sort((a, b) => a.start.localeCompare(b.start)) }))
  }, [filtered, projects])

  const { start, days } = useMemo(() => {
    let min = today, max = addDays(today, 30)
    grouped.forEach(g => {
      [g.project?.start, ...g.tasks.map(t => t.start)].forEach(s => { if (s && s < min) min = s })
      ;[g.project?.target, ...g.tasks.map(t => t.due)].forEach(s => { if (s && s > max) max = s })
    })
    const floor = addDays(today, -MAX_BACK)
    const s = addDays(min < floor ? floor : min, -7)
    return { start: s, days: daysBetween(s, addDays(max, 14)) + 1 }
  }, [grouped, today])

  const x = (iso: string) => Math.max(daysBetween(start, iso), 0) * px
  const width = days * px
  const todayX = daysBetween(start, today) * px

  const months = useMemo(() => {
    const out: { label: string; x: number; w: number }[] = []
    let cur = start
    while (daysBetween(cur, addDays(start, days)) > 0) {
      const d = parseISO(cur)
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const nextIso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`
      const endIso = daysBetween(nextIso, addDays(start, days)) < 0 ? addDays(start, days) : nextIso
      out.push({ label: d.toLocaleDateString('es-MX', { month: zoom === 'quarter' ? 'short' : 'long', year: 'numeric' }), x: daysBetween(start, cur) * px, w: daysBetween(cur, endIso) * px })
      cur = endIso
    }
    return out
  }, [start, days, px, zoom])

  const weeks = useMemo(() => {
    const out: { x: number; label: string }[] = []
    let d = start
    while (parseISO(d).getDay() !== 1) d = addDays(d, 1)
    for (; daysBetween(d, addDays(start, days)) > 0; d = addDays(d, 7)) out.push({ x: daysBetween(start, d) * px, label: String(parseISO(d).getDate()) })
    return out
  }, [start, days, px])

  const layout = useMemo(() => {
    const pos: Record<string, { x1: number; x2: number; y: number }> = {}
    let y = 0
    grouped.forEach(g => {
      y += GROUP_H
      if (!collapsed[g.pid]) g.tasks.forEach(t => {
        pos[t.key] = { x1: x(t.start), x2: x(t.due) + px, y: y + ROW_H / 2 }
        y += ROW_H
      })
    })
    return { pos, height: y }
  }, [grouped, collapsed, px, start])

  const keyById = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t.key])), [tasks])
  const arrows = useMemo(() => filtered.flatMap(t => (t.dependsOn ?? []).map(dep => {
    const a = layout.pos[keyById[dep] ?? dep], b = layout.pos[t.key]
    return a && b ? { a, b, id: `${dep}-${t.key}` } : null
  }).filter(Boolean) as { a: { x2: number; y: number }; b: { x1: number; y: number }; id: string }[]), [filtered, layout, keyById])

  const scrollToToday = () => {
    const el = scrollRef.current
    if (el) el.scrollTo({ left: Math.max(todayX - (el.clientWidth - LABEL_W) / 3, 0), behavior: 'smooth' })
  }
  useEffect(() => { scrollToToday() }, [zoom, todayX])

  return (
    <div className="space-y-4">
      <FilterBar filters={filters} setFilters={setFilters} fields={['search', 'project', 'owner', 'status', 'health']} placeholder="Buscar en el Gantt…">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} className="accent-primary" /> Solo abiertas
        </label>
        <button onClick={scrollToToday} className="h-8 px-2.5 text-xs rounded-md border hover:bg-muted flex items-center gap-1.5"><Crosshair className="h-3.5 w-3.5" />Hoy</button>
        <Segmented value={zoom} onChange={setZoom} options={[{ v: 'week', l: 'Semana' }, { v: 'month', l: 'Mes' }, { v: 'quarter', l: 'Trimestre' }]} />
      </FilterBar>

      <Card className="overflow-hidden">
        <div ref={scrollRef} className="overflow-auto max-h-[calc(100vh-220px)] relative">
          <div style={{ width: LABEL_W + width }} className="relative">
            {/* Header */}
            <div className="sticky top-0 z-30 flex bg-card border-b" style={{ height: HEAD_H }}>
              <div className="sticky left-0 z-10 bg-card border-r flex items-end px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: LABEL_W, minWidth: LABEL_W }}>
                Proyecto / tarea
              </div>
              <div className="relative" style={{ width }}>
                {months.map(m => (
                  <div key={m.x} className="absolute top-0 h-[22px] border-l px-2 text-[11px] font-semibold capitalize flex items-center truncate" style={{ left: m.x, width: m.w }}>{m.w > 50 ? m.label : ''}</div>
                ))}
                {zoom !== 'quarter' && weeks.map(w => (
                  <div key={w.x} className="absolute bottom-0 h-[22px] border-l border-border/50 pl-1 text-[10px] text-muted-foreground flex items-center tabular-nums" style={{ left: w.x }}>{w.label}</div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="relative">
              <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: LABEL_W, width }}>
                {months.map(m => <div key={m.x} className="absolute top-0 bottom-0 border-l border-border/70" style={{ left: m.x }} />)}
                {zoom === 'week' && weeks.map(w => <div key={w.x} className="absolute top-0 bottom-0 border-l border-border/30" style={{ left: w.x }} />)}
                {zoom === 'week' && weeks.map(w => <div key={`we${w.x}`} className="absolute top-0 bottom-0 bg-muted/40" style={{ left: w.x - 2 * px, width: 2 * px }} />)}
                <div className="absolute top-0 bottom-0 z-20 border-l-2 border-red-500" style={{ left: todayX + px / 2 }}>
                  <span className="sticky top-0 -ml-[15px] bg-red-500 text-white text-[9px] font-bold px-1 rounded-b">HOY</span>
                </div>
              </div>

              <svg className="absolute pointer-events-none z-10" style={{ left: LABEL_W, top: 0, width, height: layout.height }}>
                <defs>
                  <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                    <path d="M0 0 L10 5 L0 10 z" fill="#6366f1" />
                  </marker>
                </defs>
                {arrows.map(({ a, b, id }) => {
                  const mx = Math.max(a.x2 + 10, b.x1 - 10)
                  return <path key={id} d={`M${a.x2} ${a.y} H${mx} V${b.y} H${b.x1 - 1}`} fill="none" stroke="#6366f1" strokeWidth={1.5} strokeOpacity={0.7} markerEnd="url(#dep-arrow)" />
                })}
              </svg>

              {grouped.map(g => {
                const p = g.project
                const isCol = collapsed[g.pid]
                return (
                  <div key={g.pid}>
                    <div className="flex border-b bg-muted/40" style={{ height: GROUP_H }}>
                      <button onClick={() => setCollapsed(c => ({ ...c, [g.pid]: !c[g.pid] }))}
                        className="sticky left-0 z-20 bg-muted flex items-center gap-2 px-2 border-r text-left hover:bg-muted/80" style={{ width: LABEL_W, minWidth: LABEL_W }}>
                        {isCol ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: HEALTH_HEX[p.health] }} />
                        <span className="text-xs font-bold truncate flex-1">{p.name}</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{p.progress}%</span>
                      </button>
                      <div className="relative" style={{ width }}>
                        <div className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-foreground/15 overflow-hidden" style={{ left: x(p.start), width: Math.max(x(p.target) - x(p.start), 4) }}>
                          <div className="h-full" style={{ width: `${p.progress}%`, background: HEALTH_HEX[p.health] }} />
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="absolute top-1/2 h-3 w-3 rotate-45 -translate-y-1/2 -translate-x-1/2 border-2 border-card" style={{ left: x(p.target) + px / 2, background: HEALTH_HEX[p.health] }} />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">Meta de {p.name}: {fmtDate(p.target, { day: 'numeric', month: 'long' })}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    {!isCol && g.tasks.map(t => {
                      const bx = x(t.start), bw = Math.max(x(t.due) + px - bx, 6)
                      const lateW = t.health === 'Atrasado' ? Math.max(todayX - (x(t.due) + px), 0) : 0
                      const cut = daysBetween(start, t.start) < 0
                      return (
                        <div key={t.key} className="flex border-b border-border/50 hover:bg-muted/20 group" style={{ height: ROW_H }}>
                          <button onClick={() => onSelectTask(t.key)} className="sticky left-0 z-20 bg-card group-hover:bg-muted flex items-center gap-2 pl-8 pr-2 border-r text-left" style={{ width: LABEL_W, minWidth: LABEL_W }}>
                            <PersonAvatar name={t.owner} size="xs" />
                            <span className="text-xs truncate flex-1">{t.name}</span>
                          </button>
                          <div className="relative" style={{ width }}>
                            {lateW > 0 && (
                              <div className="absolute top-[9px] h-[14px] rounded-r-sm" style={{ left: bx + bw, width: lateW, background: 'repeating-linear-gradient(135deg, rgba(239,68,68,.45) 0 4px, transparent 4px 8px)' }} />
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button onClick={() => onSelectTask(t.key)}
                                  className={cn('absolute top-[5px] h-[22px] rounded-md overflow-hidden flex items-center text-left hover:ring-2 hover:ring-primary/50 transition-shadow', cut && 'rounded-l-none')}
                                  style={{ left: bx, width: bw, background: `${STATUS_HEX[t.status]}40`, boxShadow: `inset 0 0 0 1px ${STATUS_HEX[t.status]}` }}>
                                  <span className="absolute inset-y-0 left-0" style={{ width: `${t.progress}%`, background: STATUS_HEX[t.status] }} />
                                  {bw > 70 && <span className="relative z-10 px-1.5 text-[10px] font-semibold truncate text-foreground mix-blend-normal">{t.progress}% · {firstName(t.owner)}</span>}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs space-y-1">
                                <p className="font-semibold text-xs">{t.id} · {t.name}</p>
                                <p className="text-[11px]">{t.owner}{t.coOwner ? ` + ${t.coOwner}` : ''}</p>
                                <div className="flex gap-2 items-center">
                                  <Badge className={cn(statusStyle(t.status), 'border-0 text-[10px]')}>{t.status}</Badge>
                                  <span className="text-[11px] tabular-nums">{t.progress}%</span>
                                </div>
                                <p className="text-[11px] tabular-nums">{fmtDate(t.start)} → {fmtDate(t.due)}{t.health === 'Atrasado' ? ` · ${-t.daysLeft} días tarde` : ''}</p>
                                {t.dependsOn?.length ? <p className="text-[11px]">Depende de: {t.dependsOn.join(', ')}</p> : null}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
          {grouped.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No hay tareas con estos filtros.</p>}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        {(Object.keys(STATUS_HEX) as (keyof typeof STATUS_HEX)[]).map(s => <span key={s} className="flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm" style={{ background: STATUS_HEX[s] }} />{s}</span>)}
        <span className="flex items-center gap-1"><span className="h-2.5 w-4 rounded-sm" style={{ background: 'repeating-linear-gradient(135deg, rgba(239,68,68,.6) 0 3px, transparent 3px 6px)' }} />Retraso hasta hoy</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rotate-45 bg-indigo-500" />Meta del proyecto</span>
        <span className="flex items-center gap-1"><svg width="22" height="8"><path d="M0 4 H18" stroke="#6366f1" strokeWidth="1.5" /><path d="M16 0 L22 4 L16 8z" fill="#6366f1" /></svg>Dependencia</span>
        <span>Proyecto: {PROJECT_MAP[filters.project]?.name ?? 'todos'}</span>
      </div>
    </div>
  )
}
