import { LOGO } from '../logo'
import { type View } from '../data'
import type { SyncState } from '../store'
import { LayoutDashboard, FolderKanban, ListChecks, Columns3, GanttChart, Users, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'mine', label: 'Mis pendientes', icon: ListTodo },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Proyectos', icon: FolderKanban },
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
    <div className="flex flex-col h-full w-full" style={{ background: 'hsl(var(--sidebar))' }}>
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div role="img" aria-label="Chambita" className="w-9 h-9 rounded-xl bg-white shadow-[0_4px_14px_-4px_rgba(154,196,30,0.6)] shrink-0" style={{ backgroundImage: `url(${LOGO})`, backgroundSize: '160%', backgroundPosition: 'center' }} />
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Chambita Casa</p>
            <p className="text-[11px] leading-tight" style={{ color: 'hsl(var(--sidebar-foreground))' }}>Casa</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(item => {
          const active = view === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={cn('relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 focus-visible:outline-indigo-400',
                active ? 'bg-white/[0.10] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-indigo-400' : 'text-white/55 hover:text-white hover:bg-white/[0.05]')}>
              <item.icon className={cn('h-[18px] w-[18px]', active ? 'opacity-100' : 'opacity-60')} />
              {item.label}
              {item.id === 'tasks' && <span className="ml-auto text-[11px] tabular-nums text-white/40">{counts.tasks}</span>}
              {item.id === 'dashboard' && counts.overdue > 0 && (
                <span className="ml-auto text-[10px] font-bold tabular-nums rounded-full bg-red-500/90 text-white px-1.5 py-px">{counts.overdue}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="px-5 py-3 border-t border-white/[0.08] space-y-1.5">
        <p className="flex items-center gap-2 text-[11px] text-white/70">
          <span className={cn('h-2 w-2 rounded-full', s.dot)} />{s.text}
        </p>
      </div>
    </div>
  )
}
