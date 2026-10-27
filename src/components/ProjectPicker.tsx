import { useState } from 'react'
import { PROJECTS_META, textFilter } from '../data'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProjectPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = PROJECTS_META.find(p => p.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" role="combobox" aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm hover:border-primary/40">
          <span className={cn('truncate', !current && 'text-muted-foreground')}>{current ? `${current.id} · ${current.name}` : 'Proyecto'}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command filter={textFilter}>
          <CommandInput placeholder="Escribe para buscar un proyecto…" />
          <CommandList className="max-h-64">
            <CommandEmpty>Sin proyectos con ese nombre.</CommandEmpty>
            <CommandGroup>
              {PROJECTS_META.map(p => (
                <CommandItem key={p.id} value={`${p.id} ${p.name} ${p.owner}`} onSelect={() => { onChange(p.id); setOpen(false) }}>
                  <Check className={cn('h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="text-muted-foreground tabular-nums">{p.id}</span>
                  <span className="truncate">{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
