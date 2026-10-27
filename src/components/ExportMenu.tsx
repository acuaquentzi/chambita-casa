import { useState } from 'react'
import { type Task, type Project, type Filters, PROJECT_MAP, STATUSES, applyFilters, computeTeam } from '../data'
import { saveFile } from '../store'
import { useReschedules, historyFor, slipCount } from '../reschedule'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Download, FileSpreadsheet, ClipboardList, CheckCircle2 } from 'lucide-react'

interface Props {
  tasks: Task[]
  projects: Project[]
  filters: Filters
  today: string
}

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const row = (cells: unknown[]) => cells.map(q).join(',') + '\n'

export function ExportMenu({ tasks, projects, filters, today }: Props) {
  const [done, setDone] = useState<string | null>(null)
  const rs = useReschedules()?.list ?? []
  const filtered = applyFilters(tasks, filters)

  const build = (type: 'tasks' | 'projects' | 'summary') => {
    if (type === 'tasks') {
      return row(['ID', 'Proyecto', 'Tarea', 'Responsable', 'Corresponsable', 'Prioridad', 'Estatus', 'Inicio', 'Compromiso', 'Avance %', 'Días restantes', 'Salud', 'Próximo paso', 'Depende de', 'Veces reprogramada', 'Compromiso original']) +
        filtered.map(t => row([t.id, PROJECT_MAP[t.project]?.name, t.name, t.owner, t.coOwner, t.priority, t.status, t.start, t.due, t.progress, t.daysLeft, t.health, t.next, (t.dependsOn ?? []).join(' '), slipCount(rs, 'task', t.key), historyFor(rs, 'task', t.key)[0]?.from ?? t.due])).join('')
    }
    if (type === 'projects') {
      return row(['ID', 'Proyecto', 'Owner', 'Prioridad', 'Estatus', 'Inicio', 'Meta', 'Avance %', 'Tareas', 'Completadas', 'Abiertas', 'Atrasadas', 'En riesgo', 'Salud']) +
        projects.map(p => row([p.id, p.name, p.owner, p.priority, p.status, p.start, p.target, p.progress, p.totalTasks, p.completed, p.open, p.overdue, p.atRisk, p.health])).join('')
    }
    const open = tasks.filter(t => t.status !== 'Completado')
    const team = computeTeam(tasks, projects)
    let s = `Resumen Chambita — ${today}\n\n`
    s += `Tareas: ${tasks.length} · abiertas ${open.length} · atrasadas ${open.filter(t => t.health === 'Atrasado').length} · en riesgo ${open.filter(t => t.health === 'En riesgo').length}\n`
    s += `Avance global: ${Math.round(tasks.reduce((a, t) => a + t.progress, 0) / Math.max(tasks.length, 1))}%\n\nPor estatus:\n`
    STATUSES.forEach(st => { s += `  ${st}: ${tasks.filter(t => t.status === st).length}\n` })
    s += `\nProyectos atrasados:\n`
    projects.filter(p => p.health === 'Atrasado').forEach(p => { s += `  ${p.id} ${p.name} — ${p.overdue} atrasada(s), ${p.progress}%\n` })
    s += `\nCarga por persona:\n`
    team.forEach(m => { s += `  ${m.name}: ${m.open} abiertas, ${m.overdue} atrasadas, ${m.progress}% prom.\n` })
    return s
  }

  const run = async (type: 'tasks' | 'projects' | 'summary') => {
    const name = type === 'summary' ? `resumen-chambita-${today}.txt` : `${type === 'tasks' ? 'tareas' : 'proyectos'}-chambita-${today}.csv`
    const data = type === 'summary' ? build(type) : '﻿' + build(type)
    const r = await saveFile(name, data)
    setDone(r === 'saved' ? `${type}:Descargado` : r === 'copied' ? `${type}:Copiado al portapapeles` : `${type}:No se pudo exportar`)
    setTimeout(() => setDone(null), 2500)
  }

  const options = [
    { type: 'tasks' as const, label: 'Tareas (CSV)', desc: `${filtered.length} tareas con los filtros actuales`, icon: FileSpreadsheet },
    { type: 'projects' as const, label: 'Proyectos (CSV)', desc: `${projects.length} proyectos con KPIs calculados`, icon: FileSpreadsheet },
    { type: 'summary' as const, label: 'Resumen ejecutivo', desc: 'KPIs, proyectos atrasados y carga', icon: ClipboardList },
  ]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Exportar"><Download className="h-5 w-5" /></Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        <div className="px-3 py-2.5 border-b">
          <p className="text-sm font-semibold">Exportar</p>
          <p className="text-[11px] text-muted-foreground">Descarga el archivo; si no se puede, se copia al portapapeles</p>
        </div>
        <div className="py-1">
          {options.map(o => {
            const msg = done?.startsWith(o.type + ':') ? done.split(':')[1] : null
            return (
              <button key={o.type} className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-muted/50 text-left" onClick={() => run(o.type)}>
                {msg ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <o.icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{msg ?? o.label}</p>
                  <p className="text-[11px] text-muted-foreground">{o.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
