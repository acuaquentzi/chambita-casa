import { type BaseTask, type Priority, type Project, ALL_OWNERS, PRIORITIES, displayName } from '../data'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProjectPicker } from './ProjectPicker'

export interface TaskDraft { name: string; project: string; owner: string; priority: Priority; due: string; extra: Partial<BaseTask>; copyOf: string }
export const EMPTY_TASK: TaskDraft = { name: '', project: '', owner: '', priority: 'Media', due: '', extra: {}, copyOf: '' }

export interface ProjectDraft { name: string; owner: string; priority: Priority; target: string; basedOn: string }
export const EMPTY_PROJECT: ProjectDraft = { name: '', owner: '', priority: 'Media', target: '', basedOn: '' }

type Setter<T> = React.Dispatch<React.SetStateAction<T>>

export function NewTaskDialog({ open, onOpenChange, draft, setDraft, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; draft: TaskDraft; setDraft: Setter<TaskDraft>; onCreate: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{draft.copyOf ? `Duplicar ${draft.copyOf}` : 'Nueva tarea'}</DialogTitle>
          {draft.copyOf && <p className="text-xs text-muted-foreground">Se copian responsable, corresponsable, prioridad, fecha, próximo paso, notas, documentos y dependencias. Arranca en "No iniciado" al 0%.</p>}
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Input placeholder="Nombre de la tarea" value={draft.name} onChange={e => setDraft(t => ({ ...t, name: e.target.value }))} />
          <ProjectPicker value={draft.project} onChange={v => setDraft(t => ({ ...t, project: v }))} />
          <Select value={draft.owner || undefined} onValueChange={v => setDraft(t => ({ ...t, owner: v }))}>
            <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
            <SelectContent>{ALL_OWNERS.map(o => <SelectItem key={o} value={o}>{displayName(o)}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={draft.priority} onValueChange={v => setDraft(t => ({ ...t, priority: v as Priority }))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={draft.due} onChange={e => setDraft(t => ({ ...t, due: e.target.value }))} className="flex-1" aria-label="Fecha compromiso" />
          </div>
          <Button className="w-full" onClick={onCreate} disabled={!draft.name || !draft.project || !draft.owner}>Crear tarea</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function NewProjectDialog({ open, onOpenChange, draft, setDraft, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; draft: ProjectDraft; setDraft: Setter<ProjectDraft>; onCreate: () => void; projects: Project[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nuevo proyecto</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-2">
          <Input placeholder="Nombre del proyecto" value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} />
          <Select value={draft.owner || undefined} onValueChange={v => setDraft(p => ({ ...p, owner: v }))}>
            <SelectTrigger><SelectValue placeholder="Owner del proyecto" /></SelectTrigger>
            <SelectContent>{ALL_OWNERS.map(o => <SelectItem key={o} value={o}>{displayName(o)}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={draft.priority} onValueChange={v => setDraft(p => ({ ...p, priority: v as Priority }))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={draft.target} onChange={e => setDraft(p => ({ ...p, target: e.target.value }))} className="flex-1" aria-label="Fecha objetivo" />
          </div>
          <p className="text-[11px] text-muted-foreground">Se crea como "No iniciado" con inicio hoy. </p>
          <Button className="w-full" onClick={onCreate} disabled={!draft.name || !draft.owner}>Crear proyecto</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
