import { useState, useMemo } from 'react'
import { type Filters, type Project, type Health, HEALTH_HEX, statusStyle, healthStyle, priorityStyle, fmtDate } from '../data'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Ring, StatusBar, PersonAvatar } from './charts'
import { FilterBar, Segmented } from './FilterBar'
import { ArrowUpDown, LayoutGrid, Rows3, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  projects: Project[]
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  onSelectProject: (id: string) => void
  onAddProject: () => void
}

const HEALTH_ORDER: Record<Health, number> = { 'Atrasado': 0, 'En riesgo': 1, 'En tiempo': 2, 'Completado': 3 }

export function ProjectsView({ projects, filters, setFilters, onSelectProject, onAddProject }: Props) {
  const [mode, setMode] = useState<'cards' | 'table'>('cards')
  const [sortCol, setSortCol] = useState<string>('health')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const data = useMemo(() => {
    const q = filters.search.toLowerCase()
    const d = projects.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) &&
      (!filters.owner || p.owner === filters.owner) &&
      (!filters.status || p.status === filters.status) &&
      (!filters.priority || p.priority === filters.priority) &&
      (!filters.health || p.health === filters.health))
    return d.sort((a, b) => {
      const va = sortCol === 'health' ? HEALTH_ORDER[a.health] : (a as any)[sortCol]
      const vb = sortCol === 'health' ? HEALTH_ORDER[b.health] : (b as any)[sortCol]
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return (sortDir === 'asc' ? cmp : -cmp) || a.id.localeCompare(b.id)
    })
  }, [projects, filters, sortCol, sortDir])

  const SortHead = ({ col, children, className }: { col: string; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn('cursor-pointer select-none hover:text-primary whitespace-nowrap', className)} onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">{children}{sortCol === col && <ArrowUpDown className="h-3 w-3" />}</span>
    </TableHead>
  )

  return (
    <div className="space-y-4 max-w-[1500px]">
      <FilterBar filters={filters} setFilters={setFilters} fields={['search', 'owner', 'status', 'priority', 'health']} placeholder="Buscar proyecto…">
        <Segmented value={mode} onChange={setMode} options={[
          { v: 'cards', l: <><LayoutGrid className="h-3.5 w-3.5" />Tarjetas</> },
          { v: 'table', l: <><Rows3 className="h-3.5 w-3.5" />Tabla</> },
        ]} />
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onAddProject}><Plus className="h-4 w-4" />Nuevo proyecto</Button>
      </FilterBar>

      {mode === 'cards' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {data.map(p => (
            <button key={p.id} onClick={() => onSelectProject(p.id)}
              className="text-left rounded-xl border bg-card hover:shadow-lift hover:-translate-y-0.5 hover:border-primary/40 transition-all overflow-hidden flex flex-col">
              <div className="h-1.5" style={{ background: HEALTH_HEX[p.health] }} />
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <Ring value={p.progress} size={52} stroke={6} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-muted-foreground">{p.id}</p>
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{p.name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge className={cn(statusStyle(p.status), 'border-0 text-[10px]')}>{p.status}</Badge>
                  <Badge className={cn(healthStyle(p.health), 'border-0 text-[10px]')}>{p.health}</Badge>
                  <Badge className={cn(priorityStyle(p.priority), 'border-0 text-[10px]')}>{p.priority}</Badge>
                </div>
                <StatusBar counts={p.statusCounts} height={7} />
                <div className="grid grid-cols-3 text-center border rounded-lg divide-x">
                  <Stat label="Tareas" value={p.totalTasks} />
                  <Stat label="Hechas" value={p.completed} cls="text-emerald-600 dark:text-emerald-400" />
                  <Stat label="Atrasadas" value={p.overdue} cls={p.overdue ? 'text-red-600 dark:text-red-400' : ''} />
                </div>
                <div className="flex items-center gap-2 mt-auto text-[11px] text-muted-foreground">
                  <PersonAvatar name={p.owner} size="xs" />
                  <span className="truncate">{p.owner}</span>
                  <span className={cn('ml-auto tabular-nums whitespace-nowrap', p.daysToTarget < 0 && p.health !== 'Completado' && 'text-red-600 dark:text-red-400 font-semibold')}>
                    Meta {fmtDate(p.target)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHead col="id">ID</SortHead>
                  <SortHead col="name">Proyecto</SortHead>
                  <SortHead col="owner">Owner</SortHead>
                  <SortHead col="priority">Prioridad</SortHead>
                  <SortHead col="status">Estatus</SortHead>
                  <SortHead col="progress" className="min-w-[160px]">Avance</SortHead>
                  <TableHead className="min-w-[140px]">Distribución</TableHead>
                  <SortHead col="target">Meta</SortHead>
                  <SortHead col="overdue">Atrasadas</SortHead>
                  <SortHead col="health">Salud</SortHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(p => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => onSelectProject(p.id)}>
                    <TableCell className="font-semibold text-primary">{p.id}</TableCell>
                    <TableCell className="max-w-[260px]"><span className="truncate block font-medium">{p.name}</span></TableCell>
                    <TableCell className="whitespace-nowrap"><span className="flex items-center gap-2"><PersonAvatar name={p.owner} size="xs" />{p.owner.split(' ')[0]}</span></TableCell>
                    <TableCell><Badge className={cn(priorityStyle(p.priority), 'border-0 text-[11px]')}>{p.priority}</Badge></TableCell>
                    <TableCell><Badge className={cn(statusStyle(p.status), 'border-0 text-[11px]')}>{p.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${p.progress}%`, background: HEALTH_HEX[p.health] }} />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-9 text-right">{p.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBar counts={p.statusCounts} height={6} /></TableCell>
                    <TableCell className="tabular-nums whitespace-nowrap text-sm">{fmtDate(p.target, { day: 'numeric', month: 'short', year: '2-digit' })}</TableCell>
                    <TableCell className="tabular-nums text-center">
                      <span className={p.overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}>{p.overdue}</span>
                    </TableCell>
                    <TableCell><Badge className={cn(healthStyle(p.health), 'border-0 text-[11px]')}>{p.health}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">{data.length} proyectos</p>
    </div>
  )
}

function Stat({ label, value, cls }: { label: string; value: number; cls?: string }) {
  return (
    <div className="py-1.5">
      <p className={cn('text-base font-bold tabular-nums leading-tight', cls)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
