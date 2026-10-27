import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function LogoMark({ className }: Props) {
  return (
    <div className={cn('relative grid shrink-0 place-items-center', className)}>
      <svg viewBox="0 0 64 64" role="img" aria-label="Marea" className="h-full w-full overflow-visible drop-shadow-[0_8px_18px_rgba(45,212,191,0.3)]">
        <path d="M13 38V18c0-3 3.5-4.7 5.9-2.9L32 25l13.1-9.9C47.5 13.3 51 15 51 18v20" fill="none" stroke="#2f6fbb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
        <path d="M8 39c9 10 18-2 29 5 7 4 13 3 19-3-3 12-13 18-25 16C19 55 10 49 8 39Z" fill="#16b8a6" />
        <path d="M20 44c9-2 13 8 23 6 5-1 9-4 13-9-2 9-10 14-19 14-8 0-14-4-17-11Z" fill="#62d7cf" />
        <path d="M39 38c5-8 14-7 18-1 3 5 1 11-3 15 1-8-3-12-8-12-3 0-5 1-7 3-1-2-1-3 0-5Z" fill="#41c9bd" />
        <rect x="27" y="31" width="5" height="5" rx="1.4" fill="#62d7cf" />
        <rect x="34" y="31" width="5" height="5" rx="1.4" fill="#62d7cf" />
      </svg>
    </div>
  )
}
