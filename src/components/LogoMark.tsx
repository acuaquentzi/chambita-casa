import { useState } from 'react'
import { LOGO } from '../logo'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function LogoMark({ className }: Props) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      role={failed ? 'img' : undefined}
      aria-label={failed ? 'Marea' : undefined}
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-sm font-bold text-teal-700',
        className,
      )}
    >
      {failed ? (
        <span aria-hidden="true">M</span>
      ) : (
        <img
          src={LOGO}
          alt="Marea"
          className="h-full w-full object-contain p-0.5"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
