import { clsx } from 'clsx'
import type { ReactNode } from 'react'

export function Card({
  children,
  className,
  title,
  subtitle,
}: {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-purple-500/5 backdrop-blur-sm',
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="mb-4 flex flex-col gap-1">
          {title ? (
            <div className="text-lg font-semibold text-white">{title}</div>
          ) : null}
          {subtitle ? (
            <div className="text-sm text-slate-300">{subtitle}</div>
          ) : null}
        </div>
      )}
      {children}
    </div>
  )
}
