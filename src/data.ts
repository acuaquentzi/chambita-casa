import { SHEET_PROJECTS, SHEET_TASKS } from './sheet'
import { MEMBERS } from './config'

export type Status = 'No iniciado' | 'En curso' | 'En espera' | 'Bloqueado' | 'Completado'
export type Priority = 'Alta' | 'Media' | 'Baja'
export type Health = 'En tiempo' | 'En riesgo' | 'Atrasado' | 'Completado'
export type View = 'audit' | 'mine' | 'dashboard' | 'projects' | 'tasks' | 'kanban' | 'gantt' | 'team' | 'money' | 'home'

export interface Link { title: string; url: string }
export interface ProjectMeta {
  id: string; name: string; owner: string; priority: Priority | string; status: Status | string
  start: string; target: string; deleted?: boolean; links?: Link[]
}
export interface BaseTask {
  key: string; id: string; project: string; name: string; owner: string; coOwner: string
  priority: Priority | string; status: Status | string; start: string; due: string; progress: number
  next: string; notes: string; dependsOn?: string[]; deleted?: boolean; links?: Link[]; commitWeek?: string
}
export interface Task extends BaseTask {
  priority: Priority; status: Status; daysLeft: number; health: Health
}
export interface Project extends ProjectMeta {
  priority: Priority; status: Status
  progress: number; totalTasks: number; completed: number; open: number; overdue: number; atRisk: number
  health: Health; statusCounts: Record<Status, number>; daysToTarget: number
}
export interface TeamMember {
  name: string; projects: number; tasks: number; open: number; overdue: number; atRisk: number
  progress: number; statusCounts: Record<Status, number>
}
export interface Comment {
  id: string; taskKey: string; authorId: string | null; authorName: string; text: string; at: string
}
export interface Activity {
  id: string; taskKey: string; authorId: string | null; authorName: string; field: string; from: string; to: string; at: string
}
export interface Filters {
  search: string; project: string; owner: string; status: string; priority: string; health: string
}
export interface SavedView { id: string; name: string; filters: Filters }

export interface Reschedule {
  id: string; kind: 'task' | 'project'; ref: string; label: string
  from: string; to: string; reason: string; note: string; at: string; by: string | null
}
export const RESCHEDULE_REASONS = [
  'Esperando a alguien más', 'Falta dinero o presupuesto', 'Falta información',
  'Cambiaron los planes', 'Se priorizó otra cosa', 'Me tomó más tiempo', 'Otro',
] as const
export const isSlip = (r: Reschedule) => r.to > r.from

export const defaultFilters: Filters = { search: '', project: '', owner: '', status: '', priority: '', health: '' }

export const STATUSES: Status[] = ['No iniciado', 'En curso', 'En espera', 'Bloqueado', 'Completado']
export const PRIORITIES: Priority[] = ['Alta', 'Media', 'Baja']
export const HEALTHS: Health[] = ['Atrasado', 'En riesgo', 'En tiempo', 'Completado']
export const ALL_OWNERS = MEMBERS.map(m => m.name)

export const RISK_DAYS = 3
const DAY_MS = 86_400_000

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / DAY_MS)
export const addDays = (iso: string, n: number) => {
  const d = parseISO(iso); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  iso ? parseISO(iso).toLocaleDateString('es-MX', opts) : ''

const asStatus = (s: string): Status => (STATUSES as string[]).includes(s) ? s as Status : 'No iniciado'
const asPriority = (p: string): Priority => (PRIORITIES as string[]).includes(p) ? p as Priority : 'Media'

export function taskHealth(status: Status, daysLeft: number): Health {
  if (status === 'Completado') return 'Completado'
  if (daysLeft < 0) return 'Atrasado'
  if (daysLeft <= RISK_DAYS) return 'En riesgo'
  return 'En tiempo'
}

export function enrich(t: BaseTask, today: string): Task {
  const status = asStatus(t.status)
  const daysLeft = status === 'Completado' ? 0 : daysBetween(today, t.due)
  return { ...t, status, priority: asPriority(t.priority), progress: status === 'Completado' ? 100 : t.progress, daysLeft, health: taskHealth(status, daysLeft) }
}

const emptyCounts = (): Record<Status, number> => ({ 'No iniciado': 0, 'En curso': 0, 'En espera': 0, 'Bloqueado': 0, 'Completado': 0 })

export function computeProjects(tasks: Task[], today: string, metas: ProjectMeta[] = PROJECTS_META): Project[] {
  return metas.map(p => {
    const pt = tasks.filter(t => t.project === p.id)
    const statusCounts = emptyCounts()
    pt.forEach(t => statusCounts[t.status]++)
    const completed = statusCounts['Completado']
    const overdue = pt.filter(t => t.health === 'Atrasado').length
    const atRisk = pt.filter(t => t.health === 'En riesgo').length
    const progress = pt.length ? Math.round(pt.reduce((s, t) => s + t.progress, 0) / pt.length) : 0
    const allDone = pt.length > 0 && completed === pt.length
    const health: Health = allDone ? 'Completado' : overdue > 0 ? 'Atrasado' : atRisk > 0 ? 'En riesgo' : 'En tiempo'
    return {
      ...p, priority: asPriority(p.priority), status: asStatus(p.status),
      progress, totalTasks: pt.length, completed, open: pt.length - completed, overdue, atRisk, health, statusCounts,
      daysToTarget: daysBetween(today, p.target),
    }
  })
}

export function computeTeam(tasks: Task[], projects: Project[]): TeamMember[] {
  return ALL_OWNERS.map(name => {
    const mt = tasks.filter(t => t.owner === name)
    const statusCounts = emptyCounts()
    mt.forEach(t => statusCounts[t.status]++)
    return {
      name,
      projects: projects.filter(p => p.owner === name).length,
      tasks: mt.length,
      open: mt.length - statusCounts['Completado'],
      overdue: mt.filter(t => t.health === 'Atrasado').length,
      atRisk: mt.filter(t => t.health === 'En riesgo').length,
      progress: mt.length ? Math.round(mt.reduce((s, t) => s + t.progress, 0) / mt.length) : 0,
      statusCounts,
    }
  })
}

export function applyFilters(tasks: Task[], f: Filters) {
  const q = f.search.toLowerCase()
  return tasks.filter(t =>
    (!f.project || t.project === f.project) &&
    (!f.owner || t.owner === f.owner || t.coOwner === f.owner) &&
    (!f.status || t.status === f.status) &&
    (!f.priority || t.priority === f.priority) &&
    (!f.health || t.health === f.health) &&
    (!q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.owner.toLowerCase().includes(q) || t.next.toLowerCase().includes(q))
  )
}

export const SHEET_PROJECT_METAS: ProjectMeta[] = SHEET_PROJECTS
// Mutable on purpose: App refreshes these after merging shared project edits, so every view reads current names.
export const PROJECT_MAP: Record<string, ProjectMeta> = Object.fromEntries(SHEET_PROJECTS.map(p => [p.id, p]))
export const PROJECTS_META: ProjectMeta[] = [...SHEET_PROJECTS]
export function setProjectMetas(list: ProjectMeta[]) {
  PROJECTS_META.splice(0, PROJECTS_META.length, ...list)
  Object.keys(PROJECT_MAP).forEach(k => delete PROJECT_MAP[k])
  list.forEach(p => { PROJECT_MAP[p.id] = p })
}

export const BASE_TASKS: BaseTask[] = SHEET_TASKS

const REVIEWED_DATES = new Set<string>()

export interface DataIssue { key?: string; project?: string; text: string }
export function findDataIssues(tasks: Task[], projects: Project[]): DataIssue[] {
  const issues: DataIssue[] = []
  const ids: Record<string, number> = {}
  tasks.forEach(t => { ids[t.id] = (ids[t.id] || 0) + 1 })
  Object.entries(ids).filter(([, n]) => n > 1).forEach(([id]) => issues.push({ text: `El ID ${id} lo tienen dos tareas` }))
  projects.filter(p => p.status === 'Completado' && p.open > 0)
    .forEach(p => issues.push({ project: p.id, text: `${p.name} marcado Completado con ${p.open} tarea(s) abierta(s)` }))
  tasks.filter(t => t.progress === 100 && t.status !== 'Completado')
    .forEach(t => issues.push({ key: t.key, text: `${t.id} al 100% pero sigue "${t.status}"` }))
  tasks.filter(t => daysBetween(t.start, t.due) > 180 && !REVIEWED_DATES.has(t.id))
    .forEach(t => issues.push({ key: t.key, text: `${t.id} inicia ${t.start} — ¿año correcto?` }))
  return issues
}

export const AVATAR_COLORS: Record<string, string> = Object.fromEntries(MEMBERS.map(m => [m.name, m.color]))
export const getInitials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('')
export const firstName = (name: string) => name.split(' ')[0]

export const STATUS_HEX: Record<Status, string> = {
  'No iniciado': '#94a3b8', 'En curso': '#3b82f6', 'En espera': '#f59e0b', 'Bloqueado': '#ef4444', 'Completado': '#10b981',
}
export const HEALTH_HEX: Record<Health, string> = {
  'Atrasado': '#ef4444', 'En riesgo': '#f59e0b', 'En tiempo': '#10b981', 'Completado': '#6366f1',
}
export const STATUS_BAR: Record<Status, string> = {
  'No iniciado': 'bg-slate-400', 'En curso': 'bg-blue-500', 'En espera': 'bg-amber-500', 'Bloqueado': 'bg-red-500', 'Completado': 'bg-emerald-500',
}
export const statusStyle = (s: Status) => ({
  'Completado': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  'En curso': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'No iniciado': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'Bloqueado': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  'En espera': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
}[s])
export const healthStyle = (h: Health) => ({
  'Completado': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'En tiempo': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  'En riesgo': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'Atrasado': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}[h])
export const priorityStyle = (p: Priority) => ({
  'Alta': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  'Media': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'Baja': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
}[p])
export const progressColor = (v: number) =>
  v >= 75 ? 'bg-emerald-500' : v >= 50 ? 'bg-indigo-500' : v >= 25 ? 'bg-amber-500' : 'bg-red-500'

export function dueLabel(t: Task) {
  if (t.status === 'Completado') return { text: 'Hecho', cls: 'text-emerald-600 dark:text-emerald-400' }
  if (t.daysLeft < 0) return { text: `${Math.abs(t.daysLeft)}d tarde`, cls: 'text-red-600 dark:text-red-400 font-semibold' }
  if (t.daysLeft === 0) return { text: 'Hoy', cls: 'text-amber-600 dark:text-amber-400 font-semibold' }
  if (t.daysLeft === 1) return { text: 'Mañana', cls: 'text-amber-600 dark:text-amber-400 font-semibold' }
  if (t.daysLeft <= RISK_DAYS) return { text: `${t.daysLeft}d`, cls: 'text-amber-600 dark:text-amber-400' }
  return { text: `${t.daysLeft}d`, cls: 'text-muted-foreground' }
}

export const DEFAULT_SAVED_VIEWS: SavedView[] = [
  { id: 'sv-1', name: 'Atrasadas', filters: { ...defaultFilters, health: 'Atrasado' } },
  { id: 'sv-2', name: 'En riesgo', filters: { ...defaultFilters, health: 'En riesgo' } },
  { id: 'sv-3', name: 'Alta prioridad', filters: { ...defaultFilters, priority: 'Alta' } },
  { id: 'sv-4', name: 'En espera', filters: { ...defaultFilters, status: 'En espera' } },
]

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
// Substring match (all words must appear), ignoring accents and case.
export const textFilter = (value: string, search: string) => {
  const v = fold(value)
  return fold(search).split(/\s+/).filter(Boolean).every(w => v.includes(w)) ? 1 : 0
}
