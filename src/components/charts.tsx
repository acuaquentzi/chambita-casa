import { type Status, type Health, STATUSES, STATUS_HEX, HEALTH_HEX, AVATAR_COLORS, getInitials } from '../data'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function Ring({ value, size = 44, stroke = 5, color, label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const col = color ?? (value >= 75 ? '#10b981' : value >= 50 ? '#6366f1' : value >= 25 ? '#f59e0b' : '#ef4444')
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)} style={{ transition: 'stroke-dashoffset .5s ease' }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-bold tabular-nums" style={{ fontSize: size * 0.26 }}>
        {label ?? `${value}%`}
      </span>
    </div>
  )
}

export function StatusBar({ counts, height = 8, className, showLegend = false }: { counts: Record<Status, number>; height?: number; className?: string; showLegend?: boolean }) {
  const total = STATUSES.reduce((s, k) => s + counts[k], 0)
  return (
    <div className={className}>
      <div className="flex w-full overflow-hidden rounded-full bg-muted" style={{ height }}>
        {total > 0 && STATUSES.filter(s => counts[s] > 0).map(s => (
          <Tooltip key={s}>
            <TooltipTrigger asChild>
              <div style={{ width: `${(counts[s] / total) * 100}%`, background: STATUS_HEX[s] }} className="h-full transition-all first:rounded-l-full last:rounded-r-full" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{s}: {counts[s]}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {STATUSES.filter(s => counts[s] > 0).map(s => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_HEX[s] }} />{s} <b className="text-foreground tabular-nums">{counts[s]}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Donut({ data, size = 140, stroke = 18, center, onSelect }: {
  data: { label: string; value: number; color: string }[]; size?: number; stroke?: number; center?: React.ReactNode; onSelect?: (label: string) => void
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        {total > 0 && data.filter(d => d.value > 0).map(d => {
          const len = (d.value / total) * c
          const el = (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(len - 2, 0.5)} ${c}`} strokeDashoffset={-acc}
              className={cn('transition-opacity', onSelect && 'cursor-pointer hover:opacity-80')}
              onClick={() => onSelect?.(d.label)}>
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          )
          acc += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>
    </div>
  )
}

export function HealthDot({ health, className }: { health: Health; className?: string }) {
  return <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', className)} style={{ background: HEALTH_HEX[health] }} />
}

export function PersonAvatar({ name, size = 'sm', ring }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; ring?: boolean }) {
  const dim = { xs: 'h-5 w-5 text-[8px]', sm: 'h-6 w-6 text-[9px]', md: 'h-8 w-8 text-[11px]', lg: 'h-10 w-10 text-sm' }[size]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className={cn(dim, ring && 'ring-2 ring-card')}>
          <AvatarFallback className={cn('text-white font-semibold', AVATAR_COLORS[name] || 'bg-slate-500')}>{getInitials(name)}</AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{name}</TooltipContent>
    </Tooltip>
  )
}

export function OwnerStack({ owner, coOwner, size = 'sm' }: { owner: string; coOwner?: string; size?: 'xs' | 'sm' | 'md' }) {
  return (
    <div className="flex -space-x-1.5">
      <PersonAvatar name={owner} size={size} ring />
      {coOwner && <PersonAvatar name={coOwner} size={size} ring />}
    </div>
  )
}
