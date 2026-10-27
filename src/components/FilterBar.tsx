import { type Filters, defaultFilters, PROJECTS_META, ALL_OWNERS, STATUSES, PRIORITIES, HEALTHS } from '../data'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Field = 'search' | 'project' | 'owner' | 'status' | 'priority' | 'health'

interface Props {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  fields?: Field[]
  placeholder?: string
  children?: React.ReactNode
}

export function FilterBar({ filters, setFilters, fields = ['search', 'project', 'owner', 'status', 'priority', 'health'], placeholder = 'Buscar…', children }: Props) {
  const set = (k: keyof Filters) => (v: string) => setFilters(f => ({ ...f, [k]: v === '__all' ? '' : v }))
  const active = fields.some(f => filters[f])
  const sel = (k: Field, label: string, opts: { v: string; l: string }[], w: string) => fields.includes(k) && (
    <Select value={filters[k] || '__all'} onValueChange={set(k)}>
      <SelectTrigger className={cn('h-9 text-sm', w, filters[k] && 'border-primary/60 bg-primary/5')}><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">{label}: todos</SelectItem>
        {opts.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  )
  return (
    <div className="flex flex-wrap items-center gap-2">
      {fields.includes('search') && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={placeholder} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} className="w-52 h-9 text-sm pl-8" />
        </div>
      )}
      {sel('project', 'Proyecto', PROJECTS_META.map(p => ({ v: p.id, l: `${p.id} · ${p.name}` })), 'w-48')}
      {sel('owner', 'Persona', ALL_OWNERS.map(o => ({ v: o, l: o })), 'w-44')}
      {sel('status', 'Estatus', STATUSES.map(s => ({ v: s, l: s })), 'w-36')}
      {sel('priority', 'Prioridad', PRIORITIES.map(s => ({ v: s, l: s })), 'w-32')}
      {sel('health', 'Salud', HEALTHS.map(s => ({ v: s, l: s })), 'w-32')}
      {active && (
        <Button variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => setFilters(defaultFilters)}>
          <X className="h-3.5 w-3.5" /> Limpiar
        </Button>
      )}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: React.ReactNode; title?: string }[] }) {
  return (
    <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
      {options.map(o => (
        <button key={o.v} title={o.title} onClick={() => onChange(o.v)}
          className={cn('px-2.5 h-8 text-xs font-medium rounded flex items-center gap-1.5 transition-colors',
            value === o.v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
          {o.l}
        </button>
      ))}
    </div>
  )
}
