import { useState } from 'react'
import { fmtDate } from '../data'
import type { WeeklyMetric } from '../store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table2, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'

type Key = 'open' | 'overdue' | 'progress'
interface Point { date: string; value: number; live?: boolean }

const SERIES: { key: Key; label: string; color: string; unit: string; goodWhenDown: boolean }[] = [
  { key: 'overdue', label: 'Atrasadas', color: '#ef4444', unit: '', goodWhenDown: true },
  { key: 'open', label: 'Abiertas', color: '#6366f1', unit: '', goodWhenDown: true },
  { key: 'progress', label: 'Avance global', color: '#10b981', unit: '%', goodWhenDown: false },
]

export function TrendCard({ metrics, live, today }: { metrics: WeeklyMetric[]; live: Record<Key, number>; today: string }) {
  const [table, setTable] = useState(false)
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  const vals = (m: WeeklyMetric) => ({ open: num(m.open), overdue: num(m.overdue), progress: num(m.progress) })
  const valid = (metrics ?? []).filter(m => typeof m?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.date))
  const snaps = valid.filter(m => m.date < today)
  const todaySnap = valid.find(m => m.date === today)
  const rows: { date: string; live?: boolean; v: Record<Key, number> }[] = [
    ...snaps.map(m => ({ date: m.date, v: vals(m) })),
    ...(todaySnap && !snaps.length ? [{ date: today, v: vals(todaySnap) }] : []),
    { date: today, live: true, v: live },
  ]

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold">Tendencia semanal</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">Un punto cada lunes con el respaldo; el último punto es el estado de ahora mismo.</p>
        </div>
        <button onClick={() => setTable(t => !t)} className="h-8 px-2.5 text-xs rounded-md border hover:bg-muted flex items-center gap-1.5">
          {table ? <><LineChart className="h-3.5 w-3.5" />Gráfica</> : <><Table2 className="h-3.5 w-3.5" />Tabla</>}
        </button>
      </CardHeader>
      <CardContent>
        {table ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead><tr className="text-muted-foreground border-b"><th className="text-left py-1.5 font-medium">Fecha</th>{SERIES.map(s => <th key={s.key} className="text-right py-1.5 font-medium">{s.label}</th>)}</tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.date + (r.live ? 'l' : '')} className="border-b last:border-0">
                    <td className="py-1.5">{r.live ? 'Ahora' : fmtDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    {SERIES.map(s => <td key={s.key} className="text-right py-1.5">{r.v[s.key]}{s.unit}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {SERIES.map(({ key, ...s }) => <Spark key={key} {...s} points={rows.map(r => ({ date: r.date, value: r.v[key], live: r.live }))} />)}
          </div>
        )}
        {rows.length < 3 && !table && (
          <p className="text-[11px] text-muted-foreground mt-3">La línea toma forma después de 2 o 3 lunes de respaldos.</p>
        )}
      </CardContent>
    </Card>
  )
}

function Spark({ label, color, unit, goodWhenDown, points }: { label: string; color: string; unit: string; goodWhenDown: boolean; points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 260, H = 96, padL = 26, padR = 10, padT = 10, padB = 20
  const vals = points.map(p => p.value)
  const max = unit === '%' ? 100 : Math.max(4, Math.ceil(Math.max(...vals) * 1.15 / 5) * 5)
  const x = (i: number) => padL + (points.length === 1 ? (W - padL - padR) / 2 : (i / (points.length - 1)) * (W - padL - padR))
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB)
  const last = points[points.length - 1]
  const prev = points.length > 1 ? points[points.length - 2] : null
  const delta = prev ? last.value - prev.value : 0
  const good = delta === 0 ? null : goodWhenDown ? delta < 0 : delta > 0
  const solid = points.filter(p => !p.live)
  const liveIdx = points.findIndex(p => p.live)
  const h = hover !== null ? points[hover] : null

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="h-2 w-2 rounded-full self-center" style={{ background: color }} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="ml-auto text-xl font-bold tabular-nums">{last.value}{unit}</span>
        {prev && (
          <span className={cn('text-[11px] font-semibold tabular-nums', good === null ? 'text-muted-foreground' : good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta)}{unit}
          </span>
        )}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label={`${label}: ${points.map(p => `${p.live ? 'ahora' : p.date} ${p.value}${unit}`).join(', ')}`}
          onMouseLeave={() => setHover(null)}>
          {[0, max / 2, max].map(t => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="hsl(var(--border))" strokeWidth={1} />
              <text x={padL - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{Math.round(t)}</text>
            </g>
          ))}
          {solid.length > 1 && (
            <polyline fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
              points={solid.map(p => `${x(points.indexOf(p))},${y(p.value)}`).join(' ')} />
          )}
          {liveIdx > 0 && (
            <line x1={x(liveIdx - 1)} y1={y(points[liveIdx - 1].value)} x2={x(liveIdx)} y2={y(points[liveIdx].value)}
              stroke={color} strokeWidth={2} strokeDasharray="3 3" strokeLinecap="round" />
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="2 2" />}
          {points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.value)} r={4} fill={p.live ? 'hsl(var(--card))' : color} stroke={p.live ? color : 'hsl(var(--card))'} strokeWidth={2} />
          ))}
          <text x={x(0)} y={H - 4} textAnchor={points.length === 1 ? 'middle' : 'start'} fontSize={9} fill="hsl(var(--muted-foreground))">
            {points[0].live ? 'Ahora' : fmtDate(points[0].date)}
          </text>
          {points.length > 1 && <text x={x(points.length - 1)} y={H - 4} textAnchor="end" fontSize={9} fill="hsl(var(--muted-foreground))">{last.live ? 'Ahora' : fmtDate(last.date)}</text>}
          {points.map((_, i) => {
            const w = points.length === 1 ? W : (W - padL - padR) / (points.length - 1)
            return <rect key={`h${i}`} x={x(i) - w / 2} y={0} width={w} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
          })}
        </svg>
        {h && hover !== null && (
          <div className="absolute -top-2 pointer-events-none rounded-md border bg-popover px-2 py-1 text-[11px] shadow-md whitespace-nowrap"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translate(${hover === points.length - 1 ? '-100%' : hover === 0 ? '0' : '-50%'}, -100%)` }}>
            <span className="text-muted-foreground">{h.live ? 'Ahora' : fmtDate(h.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>{' '}
            <b className="tabular-nums">{h.value}{unit}</b>
          </div>
        )}
      </div>
    </div>
  )
}
