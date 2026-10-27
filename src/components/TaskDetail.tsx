import { useEffect, useMemo, useState } from 'react'
import { type Task, type Comment, type Activity, PROJECT_MAP, HEALTH_HEX, healthStyle, fmtDate } from '../data'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InlineStatus, InlinePriority, InlineOwner, InlineProgress, InlineDue, type Update } from './inline'
import { RescheduleHistory } from '../reschedule'
import { LinksEditor } from './LinksEditor'
import { Send, X, AlertTriangle, Link2, History, MessageSquare, FileText, Trash2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CommitButton } from '../agile'

interface Props {
  task: Task
  allTasks: Task[]
  comments: Comment[]
  activity: Activity[]
  nameFor: (id: string | null) => string
  canPersist: boolean
  onClose: () => void
  onAddComment: (taskKey: string, text: string) => void
  onUpdateTask: Update
  onSelectTask: (key: string) => void
  onDelete: () => void
  onDuplicate: () => void
}

const rel = (iso: string) => {
  const d = new Date(iso)
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  if (mins < 60 * 24) return `hace ${Math.round(mins / 60)} h`
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export function TaskDetail({ task: t, allTasks, comments, activity, nameFor, canPersist, onClose, onAddComment, onUpdateTask, onSelectTask, onDelete, onDuplicate }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [text, setText] = useState('')
  const [next, setNext] = useState(t.next)
  useEffect(() => setNext(t.next), [t.key, t.next])

  const byId = useMemo(() => Object.fromEntries(allTasks.map(x => [x.id, x])), [allTasks])
  const deps = (t.dependsOn ?? []).map(id => byId[id]).filter(Boolean)
  const blockers = deps.filter(d => d.status !== 'Completado')
  const blocks = allTasks.filter(x => x.dependsOn?.includes(t.id))
  const depOptions = allTasks.filter(x => x.project === t.project && x.key !== t.key && !(t.dependsOn ?? []).includes(x.id))

  const submit = () => {
    if (!text.trim()) return
    onAddComment(t.key, text.trim())
    setText('')
  }
  const saveNext = () => { if (next !== t.next) onUpdateTask(t.key, { next }) }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: HEALTH_HEX[t.health] }} />
            <span className="font-semibold">{t.id}</span>·<span className="truncate">{PROJECT_MAP[t.project]?.name}</span>
            <Badge className={cn(healthStyle(t.health), 'border-0 text-[10px] ml-auto mr-6')}>
              {t.health}{t.health === 'Atrasado' ? ` · ${-t.daysLeft}d` : t.status !== 'Completado' ? ` · ${t.daysLeft}d` : ''}
            </Badge>
          </div>
          <DialogTitle className="text-base leading-snug pr-6">{t.name}</DialogTitle>
          <div><CommitButton task={t} /></div>
        </DialogHeader>

        {blockers.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs p-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Depende de {blockers.length} tarea(s) sin terminar: {blockers.map(b => b.id).join(', ')}.</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 py-3 border-y">
          <Field label="Responsable"><InlineOwner task={t} onUpdate={onUpdateTask} /></Field>
          <Field label="Corresponsable"><InlineOwner task={t} onUpdate={onUpdateTask} field="coOwner" /></Field>
          <Field label="Estatus"><InlineStatus task={t} onUpdate={onUpdateTask} solid /></Field>
          <Field label="Prioridad"><InlinePriority task={t} onUpdate={onUpdateTask} /></Field>
          <Field label="Avance" wide><InlineProgress task={t} onUpdate={onUpdateTask} wide /></Field>
          <Field label="Inicio">
            <Input type="date" value={t.start} className="h-8 text-xs w-40" onChange={e => /^20\d\d-/.test(e.target.value) && onUpdateTask(t.key, { start: e.target.value })} />
          </Field>
          <Field label="Compromiso">
            <InlineDue task={t} onUpdate={onUpdateTask} large />
          </Field>
          <div className="sm:col-span-2 sm:pl-[108px] -mt-1">
            <RescheduleHistory kind="task" refKey={t.key} />
          </div>
          <Field label="Próximo paso" wide>
            <Textarea value={next} onChange={e => setNext(e.target.value)} onBlur={saveNext} rows={2} className="text-sm resize-none" placeholder="¿Qué sigue para esta tarea?" />
          </Field>
          <Field label="Documentos" wide>
            <LinksEditor links={t.links ?? []} onChange={links => onUpdateTask(t.key, { links })} />
          </Field>
          <Field label="Depende de" wide>
            <div className="flex flex-wrap items-center gap-1.5">
              {deps.map(d => (
                <span key={d.id} className="inline-flex items-center gap-1 rounded-full border pl-2 pr-1 py-0.5 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: HEALTH_HEX[d.health] }} />
                  <button className="hover:underline" onClick={() => onSelectTask(d.key)}>{d.id}</button>
                  <button aria-label={`Quitar ${d.id}`} className="rounded-full hover:bg-muted p-0.5"
                    onClick={() => onUpdateTask(t.key, { dependsOn: (t.dependsOn ?? []).filter(x => x !== d.id) })}><X className="h-3 w-3" /></button>
                </span>
              ))}
              {depOptions.length > 0 && (
                <Select value="" onValueChange={v => onUpdateTask(t.key, { dependsOn: [...(t.dependsOn ?? []), v] })}>
                  <SelectTrigger className="h-7 w-auto text-[11px] gap-1 px-2"><Link2 className="h-3 w-3" /><SelectValue placeholder="Agregar" /></SelectTrigger>
                  <SelectContent>{depOptions.map(o => <SelectItem key={o.key} value={o.id}>{o.id} · {o.name.slice(0, 50)}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
          </Field>
          {blocks.length > 0 && (
            <Field label="Bloquea a" wide>
              <div className="flex flex-wrap gap-1.5">
                {blocks.map(b => <button key={b.key} onClick={() => onSelectTask(b.key)} className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted">{b.id}</button>)}
              </div>
            </Field>
          )}
        </div>

        <Tabs defaultValue="comments">
          <TabsList className="h-8 max-w-full overflow-x-auto justify-start">
            <TabsTrigger value="comments" className="text-xs gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Comentarios ({comments.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5"><History className="h-3.5 w-3.5" />Historial ({activity.length})</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1.5"><FileText className="h-3.5 w-3.5" />Notas del Sheet</TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="space-y-3">
            <div className="space-y-3 max-h-[240px] overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Sin comentarios todavía.</p>}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <span className="h-7 w-7 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {(c.authorName || nameFor(c.authorId)).split(' ').map(w => w[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs"><b>{c.authorName || nameFor(c.authorId)}</b> <span className="text-muted-foreground">{rel(c.at)}</span></p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Escribe un comentario…" value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} className="h-9 text-sm" />
              <Button size="sm" className="h-9 px-3" onClick={submit} disabled={!text.trim()} aria-label="Enviar comentario"><Send className="h-4 w-4" /></Button>
            </div>
            {!canPersist && <p className="text-[11px] text-muted-foreground">Sin conexión compartida: los comentarios solo se verán en esta sesión.</p>}
          </TabsContent>

          <TabsContent value="history">
            <div className="max-h-[260px] overflow-y-auto">
              {activity.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Aún no hay cambios registrados desde la app.</p> : (
                <ol className="relative border-l ml-2 space-y-3 py-1">
                  {activity.map(a => (
                    <li key={a.id} className="ml-4">
                      <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-xs"><b>{nameFor(a.authorId)}</b> cambió <b>{a.field}</b> <span className="text-muted-foreground">· {rel(a.at)}</span></p>
                      <p className="text-xs text-muted-foreground"><span className="line-through">{a.from}</span> → <span className="text-foreground">{a.to}</span></p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes">
            <div className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap min-h-[80px]">
              {t.notes || <span className="text-muted-foreground">El Sheet no tiene comentarios para esta tarea.</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Columna "Comentarios" del Sheet · creada {fmtDate(t.start, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          {confirmDelete ? (
            <>
              <span className="text-xs text-muted-foreground mr-auto">¿Eliminar {t.id} para los dos?</span>
              <Button variant="ghost" size="sm" className="h-8" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              <Button variant="destructive" size="sm" className="h-8" onClick={onDelete}>Sí, eliminar</Button>
            </>
          ) : (
            <>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 mr-auto" onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" /> Duplicar tarea
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-red-600" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar tarea
            </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 min-w-0', wide && 'sm:col-span-2 items-start')}>
      <span className={cn('text-xs text-muted-foreground w-24 shrink-0', wide && 'pt-1.5')}>{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
