import { useState } from 'react'
import type { Link } from '../data'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ExternalLink, Paperclip, Plus, X } from 'lucide-react'

const DRIVE_RE = /(docs|drive|sheets|slides)\.google\.com/

export function LinksEditor({ links, onChange }: { links: Link[]; onChange: (next: Link[]) => void }) {
  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const valid = /^https:\/\/[^\s]+\.[^\s]+/.test(url.trim())

  const add = () => {
    if (!valid) return
    const u = url.trim()
    const t = title.trim() || (DRIVE_RE.test(u) ? 'Documento de Drive' : new URL(u).hostname)
    onChange([...links, { title: t, url: u }])
    setUrl(''); setTitle(''); setAdding(false)
  }

  return (
    <div className="space-y-1.5">
      {links.map((l, i) => (
        <div key={i} className="group flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="truncate flex-1 hover:underline text-primary">{l.title}</a>
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          <button aria-label={`Quitar ${l.title}`} onClick={() => onChange(links.filter((_, j) => j !== i))}
            className="rounded p-0.5 hover:bg-muted opacity-60 group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      {adding ? (
        <div className="space-y-1.5 rounded-md border p-2">
          <Input autoFocus value={url} onChange={e => setUrl(e.target.value)} placeholder="Pega la liga (https://drive.google.com/…)" className="h-8 text-xs"
            onKeyDown={e => e.key === 'Enter' && add()} />
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre (opcional), p. ej. OC firmada" className="h-8 text-xs"
            onKeyDown={e => e.key === 'Enter' && add()} />
          {url && !valid && <p className="text-[11px] text-red-600 dark:text-red-400">La liga debe empezar con https://</p>}
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" className="h-7" onClick={() => { setAdding(false); setUrl(''); setTitle('') }}>Cancelar</Button>
            <Button size="sm" className="h-7" disabled={!valid} onClick={add}>Agregar</Button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs text-primary flex items-center gap-1 hover:underline">
          <Plus className="h-3.5 w-3.5" /> Agregar liga o documento
        </button>
      )}
    </div>
  )
}
