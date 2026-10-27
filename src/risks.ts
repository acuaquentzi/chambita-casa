import { type Task, type Comment, type Activity, type Reschedule, ALL_OWNERS, daysBetween, parseISO } from './data'
import { SNAPSHOT_DATE } from './sheet'

export const STALE_DAYS = 14
export const RUSH_DAYS = 3
export const RUSH_PROGRESS = 50

export interface Risks {
  stale: { task: Task; days: number }[]
  rushing: Task[]
  commits: { owner: string; done: number; total: number }[]
  lastTouch: Record<string, string>
}

export function computeRisks(tasks: Task[], activity: Activity[], comments: Comment[], reschedules: Reschedule[], today: string, week: string): Risks {
  const last: Record<string, string> = {}
  const touch = (key: string, at: string) => { const d = at.slice(0, 10); if (!last[key] || d > last[key]) last[key] = d }
  activity.forEach(a => touch(a.taskKey, a.at))
  comments.forEach(c => touch(c.taskKey, c.at))
  reschedules.forEach(r => r.kind === 'task' && touch(r.ref, r.at))

  const open = tasks.filter(t => t.status !== 'Completado')
  const stale = open
    .map(t => {
      const from = last[t.key] ?? (t.start > SNAPSHOT_DATE ? t.start : SNAPSHOT_DATE)
      return { task: t, days: daysBetween(from, today) }
    })
    .filter(x => x.days > STALE_DAYS)
    .sort((a, b) => b.days - a.days)

  const rushing = open
    .filter(t => t.daysLeft >= 0 && t.daysLeft <= RUSH_DAYS && t.progress < RUSH_PROGRESS)
    .sort((a, b) => a.daysLeft - b.daysLeft || a.progress - b.progress)

  // Mid-week check: from Wednesday on, flag people who have closed less than half of what they committed.
  const weekday = parseISO(today).getDay()
  const midWeek = weekday === 0 || weekday >= 3
  const commits = midWeek ? ALL_OWNERS.map(owner => {
    const mine = tasks.filter(t => t.owner === owner && t.commitWeek === week)
    return { owner, total: mine.length, done: mine.filter(t => t.status === 'Completado').length }
  }).filter(c => c.total > 0 && c.done / c.total < 0.5) : []

  return { stale, rushing, commits, lastTouch: last }
}
