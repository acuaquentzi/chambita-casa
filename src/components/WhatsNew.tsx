import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MessageSquare, CalendarClock, Pencil, Plus } from 'lucide-react'

export interface NewsItem { id: string; at: string; who: string; kind: 'comment' | 'reschedule' | 'create' | 'edit'; target: string; detail: string; taskKey?: string }

const ICON = { comment: MessageSquare, reschedule: CalendarClock, create: Plus, edit: Pencil }
const CLS = {
  comment: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  reschedule: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  edit: 'bg-muted text-muted-foreground',
}

export function WhatsNew({ items, since, onClose, onSelectTask }: { items: NewsItem[]; since: string; onClose: () => void; onSelectTask: (k: string) => void }) {
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novedades desde tu última visita</DialogTitle>
          <DialogDescription>
            {items.length} cambio{items.length === 1 ? '' : 's'} en tus tareas y proyectos desde el {new Date(since).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.
          </DialogDescription>
        </DialogHeader>
        <ul className="overflow-y-auto -mx-2 px-2 space-y-1 flex-1">
          {items.map(n => {
            const Icon = ICON[n.kind]
            return (
              <li key={n.id}>
                <button disabled={!n.taskKey} onClick={() => { onClose(); n.taskKey && onSelectTask(n.taskKey) }}
                  className="w-full text-left flex gap-3 rounded-lg p-2.5 enabled:hover:bg-muted/60">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${CLS[n.kind]}`}><Icon className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm"><b className="font-semibold">{n.who}</b> <span className="text-muted-foreground">en</span> {n.target}</span>
                    <span className="block text-xs text-muted-foreground line-clamp-2">{n.detail}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{new Date(n.at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-end pt-2"><Button onClick={onClose}>Entendido</Button></div>
      </DialogContent>
    </Dialog>
  )
}
