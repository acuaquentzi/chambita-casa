import { createContext, useContext } from 'react'
import { type Task, addDays, parseISO } from './data'
import { Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DEFAULT_WIP = 5

export const weekStart = (iso: string) => {
  const day = parseISO(iso).getDay()
  return addDays(iso, day === 0 ? -6 : 1 - day)
}

export interface AgileApi {
  week: string
  wipLimit: number
  canEditWip: boolean
  setWipLimit: (n: number) => void
  toggleCommit: (t: Task) => void
}

const Ctx = createContext<AgileApi | null>(null)
export const AgileProvider = Ctx.Provider
export const useAgile = () => useContext(Ctx)

export const inProgressOf = (tasks: Task[], owner: string) => tasks.filter(t => t.owner === owner && t.status === 'En curso').length

export function commitStats(tasks: Task[], owner: string, week: string) {
  const mine = tasks.filter(t => t.owner === owner && t.commitWeek === week)
  return { total: mine.length, done: mine.filter(t => t.status === 'Completado').length, list: mine }
}

export function CommitButton({ task, compact }: { task: Task; compact?: boolean }) {
  const api = useAgile()
  if (!api) return null
  const on = task.commitWeek === api.week
  return (
    <button onClick={e => { e.stopPropagation(); api.toggleCommit(task) }} aria-pressed={on}
      title={on ? 'Quitar del compromiso de esta semana' : 'Comprometer para esta semana'}
      className={cn('inline-flex items-center gap-1 rounded-full border text-[11px] font-medium shrink-0 transition-colors',
        compact ? 'h-6 px-1.5' : 'h-7 px-2.5',
        on ? 'bg-violet-600 border-violet-600 text-white' : 'text-muted-foreground hover:bg-muted')}>
      <Target className="h-3.5 w-3.5" />{compact ? (on ? 'Semana' : '') : on ? 'Comprometida esta semana' : 'Comprometer esta semana'}
    </button>
  )
}

export function WipBadge({ count, limit }: { count: number; limit: number }) {
  const over = count > limit
  return (
    <span title={`${count} tareas en curso · límite ${limit}`}
      className={cn('text-[11px] font-semibold tabular-nums rounded px-1.5 py-0.5',
        over ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : count === limit ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-muted text-muted-foreground')}>
      En curso {count}/{limit}
    </span>
  )
}
