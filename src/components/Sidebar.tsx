import { type View } from '../data'
import type { SyncState } from '../store'
import { LayoutDashboard, FolderKanban, ListChecks, Columns3, GanttChart, Users, ListTodo, WalletCards, House } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoMark } from './LogoMark'

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'mine', label: 'Hoy', icon: ListTodo },
  { id: 'projects', label: 'Proyectos', icon: FolderKanban },
  { id: 'money', label: 'Dinero', icon: WalletCards },
  { id: 'home', label: 'Hogar', icon: House },
]

const WORK_VIEWS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tareas', icon: ListChecks },
  { id: 'kanban', label: 'Kanban', icon: Columns3 },
  { id: 'gantt', label: 'Gantt', icon: GanttChart },
  { id: 'team', label: 'Nosotros', icon: Users },
]

const SYNC_LABEL: Record<SyncState, { text: string; dot: string }> = {
  connecting: { text: 'Conectando…', dot: 'bg-slate-400 animate-pulse' },
  live: { text: 'En vivo · compartido', dot: 'bg-emerald-400' },
  readonly: { text: 'Solo lectura', dot: 'bg-amber-400' },
  local: { text: 'Sin sincronizar · solo esta sesión', dot: 'bg-slate-500' },
}

interface Props {
  view: View
  onNavigate: (v: View) => void
  sync: SyncState
  today: string
  counts: { tasks: number; overdue: number }
}

export function Sidebar({ view, onNavigate, sync, counts }: Props) {
  const s = SYNC_LABEL[sync]
  return (
    <div className="marea-sidebar flex h-full w-full flex-col rounded-[28px] text-white shadow-lift">
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <LogoMark className="h-12 w-12" />
          <div>
            <p className="text-lg font-extrabold leading-tight tracking-[-0.04em]">Marea</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">Nuestra vida, en orden</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2" aria-label="Familia Marea">
          <div className="rounded-xl border border-white/10 bg-[#183865]/65 px-3 py-2"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-blue-300" /><span className="text-xs font-semibold">Momio</span></div>
          <div className="rounded-xl border border-white/10 bg-pink-400/15 px-3 py-2"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-pink-300" /><span className="text-xs font-semibold">Momia</span></div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Lo cotidiano</p>
        {NAV.map(item => {
          const active = view === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={cn('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-pink-300',
                active ? 'marea-nav-active text-white' : 'text-white/55 hover:bg-white/[0.06] hover:text-white')}>
              <span className={cn('grid h-8 w-8 place-items-center rounded-lg', active ? 'bg-white/12 text-pink-200' : 'bg-white/[0.04]')}><item.icon className="h-[17px] w-[17px]" /></span>
              {item.label}
              {item.id === 'tasks' && <span className="ml-auto text-[11px] tabular-nums text-white/40">{counts.tasks}</span>}
              {item.id === 'dashboard' && counts.overdue > 0 && (
                <span className="ml-auto text-[10px] font-bold tabular-nums rounded-full bg-red-500/90 text-white px-1.5 py-px">{counts.overdue}</span>
              )}
            </button>
          )
        })}
        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Para organizarnos</p>
        {WORK_VIEWS.map(item => {
          const active = view === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={cn('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-pink-300',
                active ? 'marea-nav-active text-white' : 'text-white/55 hover:bg-white/[0.06] hover:text-white')}>
              <span className={cn('grid h-8 w-8 place-items-center rounded-lg', active ? 'bg-white/12 text-pink-200' : 'bg-white/[0.04]')}><item.icon className="h-[17px] w-[17px]" /></span>
              {item.label}
              {item.id === 'tasks' && <span className="ml-auto text-[11px] tabular-nums text-white/40">{counts.tasks}</span>}
              {item.id === 'dashboard' && counts.overdue > 0 && (
                <span className="ml-auto text-[10px] font-bold tabular-nums rounded-full bg-red-500/90 text-white px-1.5 py-px">{counts.overdue}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
        <p className="flex items-center gap-2 text-[11px] text-white/70">
          <span className={cn('h-2 w-2 rounded-full', s.dot)} />{s.text}
        </p>
      </div>
    </div>
  )
}
