import { useState } from 'react'
import { type Risks, STALE_DAYS, RUSH_DAYS, RUSH_PROGRESS } from '../risks'
import { firstName, dueLabel } from '../data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Radar, Hourglass, Gauge, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'rushing' | 'stale' | 'commits'

export function RiskCard({ risks, onSelectTask, owner }: { risks: Risks; onSelectTask: (k: string) => void; owner?: string | null }) {
  const stale = owner ? risks.stale.filter(s => s.task.owner === owner) : risks.stale
  const rushing = owner ? risks.rushing.filter(t => t.owner === owner) : risks.rushing
  const commits = owner ? risks.commits.filter(c => c.owner === owner) : risks.commits
  const tabs: { id: Tab; label: string; n: number; icon: typeof Radar; hint: string }[] = [
    { id: 'rushing', label: 'Vence pronto, poco avance', n: rushing.length, icon: Gauge, hint: `Vencen en ${RUSH_DAYS} días o menos y van debajo de ${RUSH_PROGRESS}%` },
    { id: 'stale', label: 'Sin movimiento', n: stale.length, icon: Hourglass, hint: `Abiertas sin cambios ni comentarios en más de ${STALE_DAYS} días` },
    { id: 'commits', label: 'Compromiso en riesgo', n: commits.length, icon: Target, hint: 'Desde el miércoles: menos de la mitad del compromiso semanal cumplido' },
  ]
  const [tab, setTab] = useState<Tab>(rushing.length ? 'rushing' : stale.length ? 'stale' : 'commits')
  const total = rushing.length + stale.length + commits.length
  if (owner && total === 0) return null
  const current = tabs.find(t => t.id === tab)!

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Radar className="h-4 w-4 text-violet-500" /> {owner ? 'Tu Pendientómetro' : 'Pendientómetro'}
          <span className="text-xs font-normal text-muted-foreground">· antes de que se atrasen</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
              className={cn('rounded-lg border p-2 text-left transition-all', tab === t.id ? 'border-violet-500/60 bg-violet-500/[0.07]' : 'hover:bg-muted/60')}>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><t.icon className="h-3.5 w-3.5" />{t.label}</span>
              <span className={cn('block text-xl font-bold tabular-nums', t.n ? 'text-violet-700 dark:text-violet-300' : 'text-muted-foreground')}>{t.n}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{current.hint}</p>
        <div className="space-y-0.5 max-h-[260px] overflow-y-auto">
          {tab === 'rushing' && (rushing.length ? rushing.slice(0, 30).map(t => (
            <Row key={t.key} onClick={() => onSelectTask(t.key)} left={`${t.progress}%`} title={t.name} sub={`${firstName(t.owner)} · ${dueLabel(t).text}`} />
          )) : <Empty />)}
          {tab === 'stale' && (stale.length ? stale.slice(0, 30).map(({ task: t, days }) => (
            <Row key={t.key} onClick={() => onSelectTask(t.key)} left={`${days}d`} title={t.name} sub={`${firstName(t.owner)} · ${t.status} · ${t.progress}%`} />
          )) : <Empty />)}
          {tab === 'commits' && (commits.length ? commits.map(c => (
            <div key={c.owner} className="flex items-center gap-2 text-xs px-2 py-1.5">
              <span className="w-12 font-bold tabular-nums text-violet-700 dark:text-violet-300">{c.done}/{c.total}</span>
              <span className="flex-1">{c.owner}</span>
            </div>
          )) : <Empty text="Nadie va atrasado con su compromiso de la semana." />)}
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ left, title, sub, onClick }: { left: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/60">
      <span className="w-11 shrink-0 text-center rounded bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300 text-[11px] font-bold tabular-nums py-0.5">{left}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] truncate">{title}</span>
        <span className="block text-[11px] text-muted-foreground truncate">{sub}</span>
      </span>
    </button>
  )
}

const Empty = ({ text = 'Sin señales por ahora.' }: { text?: string }) => <p className="text-xs text-muted-foreground px-2 py-3">{text}</p>
