import { useState } from 'react'
import { type Filters, type SavedView, defaultFilters } from '../data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Bookmark, Plus, Trash2, Check } from 'lucide-react'

interface Props {
  filters: Filters
  savedViews: SavedView[]
  onApply: (filters: Filters) => void
  onSave: (view: SavedView) => void
  onDelete: (id: string) => void
}

export function SavedViews({ filters, savedViews, onApply, onSave, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  const hasFilters = filters.search || filters.project || filters.owner || filters.status || filters.priority || filters.health

  const doSave = () => {
    if (!name.trim()) return
    onSave({ id: `sv-${Date.now()}`, name: name.trim(), filters: { ...filters } })
    setName('')
    setSaving(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bookmark className="h-5 w-5" />
          {savedViews.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-[14px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {savedViews.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        <div className="px-3 py-2.5 border-b">
          <p className="text-sm font-semibold">Vistas guardadas</p>
        </div>
        <div className="max-h-[260px] overflow-y-auto">
          {savedViews.length === 0 && !saving && (
            <p className="text-xs text-muted-foreground text-center py-6">Sin vistas guardadas</p>
          )}
          {savedViews.map(v => {
            const active = JSON.stringify(v.filters) === JSON.stringify(filters)
            return (
              <div key={v.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 group">
                <button className="flex-1 text-left text-sm truncate" onClick={() => { onApply(v.filters); setOpen(false) }}>
                  {v.name}
                </button>
                {active && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                <button className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => onDelete(v.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                </button>
              </div>
            )
          })}
          {saving && (
            <div className="px-3 py-2 flex gap-2">
              <Input placeholder="Nombre de la vista" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSave()} className="h-8 text-xs" autoFocus />
              <Button size="sm" className="h-8 px-2" onClick={doSave} disabled={!name.trim()}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        <div className="border-t px-3 py-2 flex gap-2">
          {hasFilters && !saving && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => setSaving(true)}>
              <Plus className="h-3.5 w-3.5" /> Guardar vista actual
            </Button>
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { onApply(defaultFilters); setOpen(false) }}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
