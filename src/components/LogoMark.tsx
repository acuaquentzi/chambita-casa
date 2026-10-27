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
        'relative grid shrink-0 place-items-center text-sm font-bold text-teal-300',
        className,
      )}
    >
      {failed ? (
        <span aria-hidden="true">M</span>
      ) : (
        <img
          src={LOGO}
          alt="Marea"
          className="h-full w-full object-contain drop-shadow-[0_8px_18px_rgba(45,212,191,0.28)]"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
