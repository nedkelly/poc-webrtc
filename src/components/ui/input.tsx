import { clsx } from 'clsx'
import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'block w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/30 transition placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
