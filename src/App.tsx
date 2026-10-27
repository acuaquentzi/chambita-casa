import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  type View, type Filters, type Task, type BaseTask, type SavedView, type ProjectMeta,
  defaultFilters, BASE_TASKS, DEFAULT_SAVED_VIEWS, ALL_OWNERS,
  enrich, computeProjects, computeTeam, todayISO, addDays, fmtDate, SHEET_PROJECT_METAS, setProjectMetas,
} from './data'
import { useStore, useProfiles, matchOwner, type Change } from './store'
import type { AppUser } from './supabase'
import { RescheduleProvider, type RescheduleApi } from './reschedule'
import { MyWork } from './components/MyWork'
import { SearchPalette } from './components/SearchPalette'
import { WhatsNew } from './components/WhatsNew'
import { useNews } from './hooks/useNews'
import { NewTaskDialog, NewProjectDialog, EMPTY_TASK, EMPTY_PROJECT } from './components/CreateDialogs'
import { Tour } from './components/Tour'
import { CloseTaskDialog, CLOSE_PREFIX } from './components/CloseTaskDialog'
import { computeRisks } from './risks'
import { AgileProvider, type AgileApi, weekStart } from './agile'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './components/Dashboard'
import { ProjectsView } from './components/ProjectsView'
import { TasksView } from './components/TasksView'
import { KanbanView } from './components/KanbanView'
import { GanttView } from './components/GanttView'
import { TeamView } from './components/TeamView'
import { MoneyHub } from './components/MoneyHub'
import { ProjectDetail } from './components/ProjectDetail'
import { TaskDetail } from './components/TaskDetail'
import { Notifications } from './components/Notifications'
import { SavedViews } from './components/SavedViews'
import { ExportMenu } from './components/ExportMenu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { HelpCircle, Search, Menu, Sun, Moon, Plus, UserRound, X, LogOut, ListTodo, FolderKanban, WalletCards, House, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const VIEW_TITLES: Record<View, string> = {
  mine: 'Hoy', dashboard: 'Resumen de proyectos', projects: 'Proyectos', tasks: 'Tareas', kanban: 'Kanban', gantt: 'Gantt', team: 'Nosotros', audit: 'Bitácora', money: 'Dinero', home: 'Hogar',
}

const FIELD_LABELS: Record<string, string> = {
  status: 'Estatus', progress: 'Avance', owner: 'Responsable', coOwner: 'Corresponsable', priority: 'Prioridad',
  due: 'Compromiso', start: 'Inicio', next: 'Próximo paso', name: 'Nombre', dependsOn: 'Dependencias', project: 'Proyecto', links: 'Ligas', commitWeek: 'Compromiso semanal',
  deleted: 'Eliminada', target: 'Meta',
}

// La cabecera móvil reserva las acciones secundarias para el menú “Más”.
export default function App({ user, onSignOut }: { user: AppUser; onSignOut: () => void }) {
  const store = useStore(user)
  const [today, setToday] = useState(todayISO)
  const [view, setView] = useState<View>(() => (window.innerWidth < 640 ? 'mine' : 'dashboard'))
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    try { const s = localStorage.getItem('ed-theme'); if (s) return s === 'dark' } catch {}
    const stamp = document.documentElement.dataset.theme
    return stamp ? stamp === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [newTask, setNewTask] = useState(EMPTY_TASK)
  const [addProjectOpen, setAddProjectOpen] = useState(false)
  const [newProject, setNewProject] = useState(EMPTY_PROJECT)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const tourChecked = useRef(false)
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 9000); return () => clearTimeout(t) }, [notice])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try { localStorage.setItem('ed-theme', dark ? 'dark' : 'light') } catch {}
  }, [dark])

  useEffect(() => {
    const t = setInterval(() => setToday(prev => { const n = todayISO(); return n === prev ? prev : n }), 60_000)
    return () => clearInterval(t)
  }, [])

  const baseByKey = useMemo(() => {
    const m: Record<string, BaseTask> = {}
    BASE_TASKS.forEach(t => { m[t.key] = t })
    Object.values(store.overrides).forEach(o => {
      if (!m[o.key] && !(o.name && o.project && o.due)) return
      m[o.key] = { ...(m[o.key] ?? {}), ...o } as BaseTask
    })
    return m
  }, [store.overrides])

  const tasks: Task[] = useMemo(
    () => Object.values(baseByKey).filter(t => !t.deleted).map(t => enrich(t, today)),
    [baseByKey, today],
  )
  const projectMetas = useMemo(() => {
    const m: Record<string, ProjectMeta> = {}
    SHEET_PROJECT_METAS.forEach(p => { m[p.id] = p })
    Object.values(store.projectOverrides).forEach(o => {
      if (!m[o.id] && !(o.name && o.owner && o.target)) return
      m[o.id] = { ...(m[o.id] ?? {}), ...o } as ProjectMeta
    })
    const list = Object.values(m).sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }))
    setProjectMetas(list)
    return list
  }, [store.projectOverrides])
  const projects = useMemo(() => computeProjects(tasks, today, projectMetas), [tasks, today, projectMetas])
  const team = useMemo(() => computeTeam(tasks, projects), [tasks, projects])
  const myOwner = matchOwner(store.me.name)

  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => { mainRef.current?.scrollTo(0, 0) }, [view])

  const navigate = useCallback((v: View, f?: Partial<Filters>) => {
    setView(v)
    setFilters(f ? { ...defaultFilters, ...f } : defaultFilters)
    setMobileOpen(false)
  }, [])

  const applyTask = useCallback((key: string, updates: Partial<BaseTask>) => {
    const current = baseByKey[key]
    if (!current) return
    const next: BaseTask = { ...current, ...updates }
    if (updates.status === 'Completado') next.progress = 100
    if (updates.progress === 100 && current.status !== 'Completado' && updates.status === undefined) next.status = 'Completado'
    const changed = (Object.keys(next) as (keyof BaseTask)[])
      .filter(k => JSON.stringify(current[k]) !== JSON.stringify(next[k]))
    if (!changed.length) return
    const changes: Change[] = changed.map(k => ({
      field: FIELD_LABELS[k] ?? k, from: fmtVal(k, current[k]), to: fmtVal(k, next[k]),
    }))
    const fields: Partial<BaseTask> = {}
    changed.forEach(k => { (fields as any)[k] = next[k] })
    store.saveTask(key, fields, changes)
  }, [baseByKey, store])

  // Every path that closes a task goes through here, so a closing comment is always requested first.
  const [closing, setClosing] = useState<{ keys: string[]; updates: Partial<BaseTask> } | null>(null)
  const updateTask = useCallback((key: string, updates: Partial<BaseTask>) => {
    const current = baseByKey[key]
    if (!current) return
    const closes = current.status !== 'Completado' && (updates.status === 'Completado' || (updates.progress === 100 && updates.status === undefined))
    if (!closes) { applyTask(key, updates); return }
    setClosing(prev => (prev && !prev.keys.includes(key) ? { ...prev, keys: [...prev.keys, key] } : prev ?? { keys: [key], updates }))
  }, [baseByKey, applyTask])
  const confirmClose = (text: string) => {
    if (!closing) return
    closing.keys.forEach(k => { applyTask(k, closing.updates); store.addComment(k, CLOSE_PREFIX + text) })
    setClosing(null)
  }

  const updateProject = useCallback((id: string, updates: Partial<ProjectMeta>) => {
    const current = projectMetas.find(p => p.id === id)
    if (!current) return
    const next = { ...current, ...updates }
    const changed = (Object.keys(updates) as (keyof ProjectMeta)[]).filter(k => JSON.stringify(current[k]) !== JSON.stringify(next[k]))
    if (!changed.length) return
    const fields: Partial<ProjectMeta> = {}
    changed.forEach(k => { (fields as any)[k] = next[k] })
    store.saveProject(id, fields, changed.map(k => ({ field: `${FIELD_LABELS[k] ?? k} (proyecto)`, from: fmtVal(k, current[k]), to: fmtVal(k, next[k]) })))
  }, [projectMetas, store])

  const addProject = useCallback(() => {
    if (!newProject.name || !newProject.owner) return
    const maxN = Math.max(0, ...projectMetas.map(p => Number(p.id.replace(/\D/g, '')) || 0))
    const id = `P-${String(maxN + 1).padStart(2, '0')}`
    const p: ProjectMeta = { id, name: newProject.name, owner: newProject.owner, coOwner: newProject.coOwner, priority: newProject.priority, status: 'No iniciado', start: today, target: newProject.target || addDays(today, 30) }
    store.saveProject(id, p, [{ field: 'Proyecto creado', from: '', to: p.name }], true)
    setNewProject(EMPTY_PROJECT)
    setAddProjectOpen(false)
    setSelectedProject(id)
  }, [newProject, projectMetas, today, store])

  const openAddTask = useCallback((projectId?: string) => {
    setNewTask(t => ({ ...t, project: projectId ?? t.project }))
    setAddTaskOpen(true)
  }, [])

  const addTask = useCallback(() => {
    if (!newTask.name || !newTask.project || !newTask.owner) return
    const maxN = Math.max(0, ...Object.values(baseByKey).map(t => Number(t.id.replace(/\D/g, '')) || 0))
    const id = `T-${String(maxN + 1).padStart(3, '0')}`
    const key = `${id}-n${Date.now().toString(36)}`
    const task: BaseTask = {
      key, id, project: newTask.project, name: newTask.name, owner: newTask.owner, coOwner: '',
      priority: newTask.priority, status: 'No iniciado', start: today, due: newTask.due || addDays(today, 14),
      progress: 0, next: '', notes: '', ...newTask.extra,
    }
    store.saveTask(key, task, [{ field: newTask.copyOf ? `Creada (copia de ${newTask.copyOf})` : 'Creada', from: '', to: task.name }], true)
    setNewTask(EMPTY_TASK)
    setAddTaskOpen(false)
  }, [newTask, baseByKey, today, store])

  const rescheduleTask = useCallback((key: string, to: string, reason: string, note: string) => {
    const t = baseByKey[key]
    if (!t || to === t.due) return
    updateTask(key, { due: to })
    store.addReschedule({ kind: 'task', ref: key, label: t.id, from: t.due, to, reason, note })
  }, [baseByKey, updateTask, store])

  const rescheduleProject = useCallback((id: string, to: string, reason: string, note: string) => {
    const p = projectMetas.find(x => x.id === id)
    if (!p || to === p.target) return
    updateProject(id, { target: to })
    store.addReschedule({ kind: 'project', ref: id, label: id, from: p.target, to, reason, note })
  }, [projectMetas, updateProject, store])

  const savedViews: SavedView[] = store.prefs?.savedViews ?? DEFAULT_SAVED_VIEWS
  const setSavedViews = (fn: (v: SavedView[]) => SavedView[]) => store.savePrefs({ savedViews: fn(savedViews) })

  const selectedTaskObj = selectedTask ? tasks.find(t => t.key === selectedTask) ?? null : null
  const selectedProjectObj = selectedProject ? projects.find(p => p.id === selectedProject) ?? null : null

  const peopleIds = useMemo(() => [
    ...store.comments.map(c => c.authorId), ...store.activity.map(a => a.authorId), ...store.reschedules.map(r => r.by),
  ], [store.comments, store.activity, store.reschedules])
  const profiles = useProfiles(store.userRef, peopleIds)
  const nameFor = useCallback((id: string | null) => (id && profiles[id]?.name) || 'Alguien', [profiles])
  const targetLabel = useCallback((key: string) => {
    if (key === 'vistas') return 'Vistas guardadas'
    if (key.startsWith('project:')) { const p = projectMetas.find(x => x.id === key.slice(8)); return p ? `Proyecto ${p.id} · ${p.name}` : key }
    const t = baseByKey[key]
    return t ? `${t.id} · ${t.name}${t.deleted ? ' (eliminada)' : ''}` : key
  }, [projectMetas, baseByKey])
  const week = weekStart(today)
  const risks = useMemo(() => computeRisks(tasks, store.activity, store.comments, store.reschedules, today, week),
    [tasks, store.activity, store.comments, store.reschedules, today, week])
  const agileApi: AgileApi = useMemo(() => ({
    week,
    wipLimit: 99,
    canEditWip: store.isOwner,
    setWipLimit: (n: number) => store.saveSettings({ wipLimit: n }),
    toggleCommit: (t: Task) => updateTask(t.key, { commitWeek: t.commitWeek === week ? '' : week }),
  }), [week, store, updateTask])
  const lastComments = useMemo(() => {
    const m: Record<string, { text: string; at: string; author: string }> = {}
    store.comments.forEach(c => { if (!m[c.taskKey] || c.at > m[c.taskKey].at) m[c.taskKey] = { text: c.text, at: c.at, author: c.authorName || nameFor(c.authorId) } })
    return m
  }, [store.comments, nameFor])
  const { news, dismiss: dismissNews } = useNews(store, myOwner, projectMetas, baseByKey, nameFor, targetLabel)
  useEffect(() => {
    if (tourChecked.current || store.sync !== 'live' || store.prefs === null) return
    tourChecked.current = true
    if (!store.prefs.tourDone) setTourOpen(true)
  }, [store.sync, store.prefs])
  const rescheduleApi: RescheduleApi = useMemo(
    () => ({ list: store.reschedules, rescheduleTask, rescheduleProject, nameFor }),
    [store.reschedules, rescheduleTask, rescheduleProject, nameFor],
  )

  const commonProps = { tasks, filters, setFilters, onUpdateTask: updateTask, onSelectTask: setSelectedTask }
  const sidebar = <Sidebar view={view} onNavigate={navigate} sync={store.sync} today={today} counts={{
    tasks: tasks.filter(t => t.status !== 'Completado').length, overdue: tasks.filter(t => t.health === 'Atrasado').length,
  }} />
  const myFilterOn = !!myOwner && filters.owner === myOwner
  const taskWorkspace = view !== 'money' && view !== 'home'

  return (
    <TooltipProvider delayDuration={200}>
      <RescheduleProvider value={rescheduleApi}>
      <AgileProvider value={agileApi}>
      <div className="marea-shell flex h-full overflow-hidden">
        <aside className="hidden lg:flex w-[268px] flex-shrink-0 p-3 pr-0">{sidebar}</aside>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-40 mx-3 mt-3 flex h-16 shrink-0 items-center gap-3 rounded-2xl border border-white/60 bg-card/85 px-4 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-card/72 lg:mx-5 lg:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menú"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[232px]">{sidebar}</SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight leading-tight truncate">{VIEW_TITLES[view]}</h1>
              <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block capitalize">
                {fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {taskWorkspace && <>
                <Button variant="outline" size="sm" className="h-8 gap-2 text-muted-foreground hidden md:inline-flex" onClick={() => setSearchOpen(true)}>
                  <Search className="h-4 w-4" /> Buscar <kbd className="text-[10px] font-semibold border rounded px-1 bg-muted">Ctrl K</kbd>
                </Button>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar" onClick={() => setSearchOpen(true)}><Search className="h-5 w-5" /></Button>
                {myOwner && (
                  <Button variant={myFilterOn ? 'default' : 'ghost'} size="sm" className="h-8 gap-1.5 hidden md:inline-flex"
                    onClick={() => setFilters(f => ({ ...f, owner: myFilterOn ? '' : myOwner }))}>
                    <UserRound className="h-4 w-4" /> Mis tareas
                  </Button>
                )}
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddTaskOpen(true)}>
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nueva tarea</span>
                </Button>
                <div className="hidden items-center sm:flex">
                  <SavedViews filters={filters} savedViews={savedViews} onApply={setFilters}
                    onSave={v => setSavedViews(p => [...p, v])} onDelete={id => setSavedViews(p => p.filter(v => v.id !== id))} />
                  <ExportMenu tasks={tasks} projects={projects} filters={filters} today={today} />
                </div>
              </>}
              <Notifications tasks={tasks} onSelectTask={setSelectedTask} />
              <div className="hidden items-center sm:flex">
                <Button variant="ghost" size="icon" onClick={() => setTourOpen(true)} aria-label="Guía de uso" title="Guía de uso"><HelpCircle className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDark(d => !d)} aria-label="Cambiar tema">
                  {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="sm:hidden" aria-label="Más opciones"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setTourOpen(true)}><HelpCircle className="mr-2 h-4 w-4" />Guía de uso</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDark(d => !d)}>{dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}{dark ? 'Tema claro' : 'Tema oscuro'}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {notice && (
            <div role="status" className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-sm px-4 lg:px-6 py-2 border-b border-amber-200 dark:border-amber-900">
              <span className="flex-1">{notice}</span>
              <button onClick={() => setNotice(null)} aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
          )}
          {store.error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm px-4 lg:px-6 py-2 border-b border-red-200 dark:border-red-900">
              <span className="flex-1">{store.error}</span>
              <button onClick={store.clearError} aria-label="Cerrar"><X className="h-4 w-4" /></button>
            </div>
          )}

          <main ref={mainRef} className="marea-main flex-1 overflow-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7 [&>*]:relative">
            {view === 'mine' && <MyWork risks={risks} tasks={tasks} myOwner={myOwner} onUpdateTask={updateTask} onSelectTask={setSelectedTask} />}
            {view === 'dashboard' && <Dashboard tasks={tasks} projects={projects} team={team} today={today} metrics={store.metrics} risks={risks} onNavigate={navigate} onSelectTask={setSelectedTask} onSelectProject={setSelectedProject} />}
            {view === 'projects' && <ProjectsView projects={projects} filters={filters} setFilters={setFilters} onSelectProject={setSelectedProject} onAddProject={() => setAddProjectOpen(true)} />}
            {view === 'tasks' && <TasksView {...commonProps} lastComments={lastComments} />}
            {view === 'kanban' && <KanbanView {...commonProps} />}
            {view === 'gantt' && <GanttView tasks={tasks} projects={projects} filters={filters} setFilters={setFilters} today={today} onSelectTask={setSelectedTask} />}
            {view === 'team' && <TeamView tasks={tasks} team={team} onSelectTask={setSelectedTask} onNavigate={navigate} />}
            {view === 'money' && <MoneyHub accounts={store.financeAccounts} transactions={store.financeTransactions} owners={ALL_OWNERS} today={today}
              onSaveAccount={store.saveFinanceAccount} onSaveTransaction={store.saveFinanceTransaction} onOpenProjects={() => navigate('projects')} />}
            {view === 'home' && <TeamView tasks={tasks} team={team} onSelectTask={setSelectedTask} onNavigate={navigate} />}
          </main>

          <nav className="marea-bottom-nav sm:hidden grid grid-cols-4 shrink-0" aria-label="Navegación principal">
            {([['mine', 'Hoy', ListTodo], ['projects', 'Proyectos', FolderKanban], ['money', 'Dinero', WalletCards], ['home', 'Hogar', House]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => navigate(v)} aria-current={view === v ? 'page' : undefined}
                className={cn('flex flex-col items-center justify-center gap-0.5 h-14 text-[11px]', view === v ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                <Icon className="h-5 w-5" />{label}
              </button>
            ))}
          </nav>
        </div>

        {selectedProjectObj && (
          <ProjectDetail project={selectedProjectObj} tasks={tasks} today={today} onClose={() => setSelectedProject(null)}
            onUpdateTask={updateTask} onUpdateProject={updateProject}
            onAddTask={() => { const id = selectedProjectObj.id; setSelectedProject(null); openAddTask(id) }}
            onSelectTask={k => { setSelectedProject(null); setSelectedTask(k) }}
            comments={store.comments} activity={store.activity} nameFor={nameFor} />
        )}

        {selectedTaskObj && (
          <TaskDetail key={selectedTaskObj.key} task={selectedTaskObj} allTasks={tasks}
            comments={store.comments.filter(c => c.taskKey === selectedTaskObj.key)}
            activity={store.activity.filter(a => a.taskKey === selectedTaskObj.key)}
            nameFor={nameFor} canPersist={store.sync === 'live'}
            onClose={() => setSelectedTask(null)} onAddComment={store.addComment} onUpdateTask={updateTask} onSelectTask={setSelectedTask}
            onDelete={() => { updateTask(selectedTaskObj.key, { deleted: true }); setSelectedTask(null) }}
            onDuplicate={() => {
              const t = selectedTaskObj
              setNewTask({
                name: `${t.name} (copia)`, project: t.project, owner: t.owner, priority: t.priority, due: t.due, copyOf: t.id,
                extra: { coOwner: t.coOwner, next: t.next, notes: t.notes, links: t.links, dependsOn: t.dependsOn },
              })
              setSelectedTask(null)
              setAddTaskOpen(true)
            }} />
        )}

        <NewTaskDialog open={addTaskOpen} draft={newTask} setDraft={setNewTask} onCreate={addTask}
          onOpenChange={o => { setAddTaskOpen(o); if (!o && newTask.copyOf) setNewTask(EMPTY_TASK) }} />

        <SearchPalette open={searchOpen} setOpen={setSearchOpen} tasks={tasks} projects={projects} onSelectTask={setSelectedTask} onSelectProject={setSelectedProject} />
        {tourOpen && (
          <Tour onNavigate={v => navigate(v)} onClose={() => { setTourOpen(false); if (!store.prefs?.tourDone) store.savePrefs({ tourDone: true }) }} />
        )}
        {news && !tourOpen && (
          <WhatsNew items={news.items} since={news.since} onSelectTask={setSelectedTask}
            onClose={dismissNews} />
        )}

        {closing && (
          <CloseTaskDialog labels={closing.keys.map(k => targetLabel(k))} onConfirm={confirmClose} onCancel={() => setClosing(null)} />
        )}

        <NewProjectDialog open={addProjectOpen} onOpenChange={setAddProjectOpen} draft={newProject} setDraft={setNewProject} onCreate={addProject} projects={projects} />
      </div>
      </AgileProvider>
      </RescheduleProvider>
    </TooltipProvider>
  )
}

function fmtVal(k: string, v: unknown): string {
  if (v === undefined || v === null || v === '') return '—'
  if (k === 'progress') return `${v}%`
  if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object' ? (x as { title?: string }).title ?? '' : String(x))).join(', ') || '—'
  return String(v)
}
