import { clsx } from 'clsx'
import type { ReactNode } from 'react'

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'success' | 'warning' | 'muted' | 'default'
}) {
  const palette: Record<typeof tone, string> = {
    success: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    warning: 'bg-amber-500/20 text-amber-100 border-amber-400/40',
    muted: 'bg-white/5 text-slate-200 border-white/10',
    default: 'bg-purple-500/20 text-purple-100 border-purple-400/30',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase whitespace-nowrap tracking-[0.16em]',
        palette[tone],
      )}
    >
      {children}
    </span>
  )
}
