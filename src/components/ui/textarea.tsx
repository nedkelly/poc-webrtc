import { clsx } from 'clsx'
import type { TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          'block w-full resize-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950/30 transition placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400',
          className,
        )}
        {...props}
      />
    )
  },
)

Textarea.displayName = 'Textarea'
