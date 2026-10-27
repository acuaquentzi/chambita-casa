import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export const CLOSE_PREFIX = 'Cierre: '
const MIN = 5

export function CloseTaskDialog({ labels, onConfirm, onCancel }: { labels: string[]; onConfirm: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  const ok = text.trim().length >= MIN
  return (
    <Dialog open onOpenChange={o => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-500" />Comentario de cierre</DialogTitle>
          <DialogDescription>
            {labels.length === 1 ? <>Antes de cerrar <b>{labels[0]}</b>, deja el resultado o cómo se resolvió.</>
              : <>Vas a cerrar <b>{labels.length} tareas</b>. El comentario se agrega a cada una.</>}
          </DialogDescription>
        </DialogHeader>
        {labels.length > 1 && (
          <ul className="max-h-28 overflow-y-auto text-xs text-muted-foreground space-y-0.5">{labels.map(l => <li key={l} className="truncate">• {l}</li>)}</ul>
        )}
        <Textarea autoFocus rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={500} className="text-sm resize-none"
          placeholder="Ej. Se recibió la factura y se pagó el 20/oct; OC archivada en Drive."
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && ok) onConfirm(text.trim()) }} />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{ok ? 'Ctrl+Enter para cerrar' : `Mínimo ${MIN} caracteres`}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
            <Button size="sm" disabled={!ok} onClick={() => onConfirm(text.trim())}>Cerrar tarea{labels.length > 1 ? 's' : ''}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
