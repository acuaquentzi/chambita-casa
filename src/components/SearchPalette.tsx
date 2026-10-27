import { useEffect } from 'react'
import { type Task, type Project, HEALTH_HEX, firstName, textFilter } from '../data'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { FolderKanban } from 'lucide-react'

interface Props {
  open: boolean
  setOpen: (o: boolean) => void
  tasks: Task[]
  projects: Project[]
  onSelectTask: (key: string) => void
  onSelectProject: (id: string) => void
}

export function SearchPalette({ open, setOpen, tasks, projects, onSelectTask, onSelectProject }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!open) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const sorted = [...tasks].sort((a, b) => (a.status === 'Completado' ? 1 : 0) - (b.status === 'Completado' ? 1 : 0) || a.id.localeCompare(b.id, 'es', { numeric: true }))

  return (
    <CommandDialog open={open} onOpenChange={setOpen} filter={textFilter}>
      <CommandInput placeholder="Busca una tarea o proyecto por nombre, ID o persona…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Proyectos">
          {projects.map(p => (
            <CommandItem key={p.id} value={`${p.id} ${p.name} ${p.owner}`} onSelect={() => { setOpen(false); onSelectProject(p.id) }}>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground tabular-nums">{p.id}</span>
              <span className="truncate flex-1">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.progress}%</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Tareas">
          {sorted.map(t => (
            <CommandItem key={t.key} value={`${t.id} ${t.name} ${t.owner} ${t.coOwner}`} onSelect={() => { setOpen(false); onSelectTask(t.key) }}>
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: HEALTH_HEX[t.health] }} />
              <span className="text-muted-foreground tabular-nums">{t.id}</span>
              <span className="truncate flex-1">{t.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{firstName(t.owner)} · {t.status}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
