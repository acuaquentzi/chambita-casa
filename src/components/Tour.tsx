import { useEffect, useState } from 'react'
import type { View } from '../data'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ListTodo, Target, Search, CalendarClock, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS: { icon: LucideIcon; title: string; text: string; view?: View }[] = [
  { icon: ListTodo, view: 'mine', title: 'Mis pendientes', text: 'Tu punto de partida. Aquí ves solo tus tareas abiertas, de la más urgente a la menos urgente. Toca una tarjeta para cambiar su estatus, avance o fecha, y la palomita para completarla.' },
  { icon: Target, view: 'mine', title: 'Tu compromiso de la semana', text: 'Cada lunes elige de 3 a 5 tareas que vas a cerrar esa semana con el botón de la diana. Arriba verás cuántas llevas cumplidas.' },
  { icon: CalendarClock, view: 'tasks', title: 'Si una fecha se mueve, di por qué', text: 'Al cambiar una fecha compromiso a una posterior, la plataforma te pide el motivo. Así queda claro qué frenó la tarea, no solo que se atrasó.' },
  { icon: Search, title: 'Encuentra cualquier cosa', text: 'Presiona Ctrl+K (o la lupa en el celular) y escribe parte del nombre, el ID o la persona para saltar a cualquier tarea o proyecto.' },
]

export function Tour({ onNavigate, onClose }: { onNavigate: (v: View) => void; onClose: () => void }) {
  const [i, setI] = useState(0)
  const s = STEPS[i]
  const last = i === STEPS.length - 1
  useEffect(() => { const v = STEPS[0].view; if (v) onNavigate(v) }, [])
  const go = (n: number) => { setI(n); const v = STEPS[n].view; if (v) onNavigate(v) }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <div className="flex justify-center pt-2">
          <span className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><s.icon className="h-7 w-7" /></span>
        </div>
        <DialogHeader className="text-center sm:text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Paso {i + 1} de {STEPS.length}</p>
          <DialogTitle className="text-lg">{s.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{s.text}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, n) => <span key={n} className={cn('h-1.5 rounded-full transition-all', n === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30')} />)}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Saltar</Button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" size="sm" onClick={() => go(i - 1)}>Anterior</Button>}
            <Button size="sm" onClick={() => (last ? onClose() : go(i + 1))}>{last ? 'Empezar' : 'Siguiente'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
