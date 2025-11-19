import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactElement } from 'react'
import { cloneElement, forwardRef, isValidElement } from 'react'

type Variant = 'primary' | 'ghost' | 'outline'
type Size = 'sm' | 'md'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  asChild?: boolean
}

const variantMap: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-purple-500 to-cyan-500 text-slate-950 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50',
  ghost: 'bg-white/5 text-white hover:bg-white/10 border border-white/10',
  outline:
    'bg-slate-950 text-white border border-white/20 hover:border-purple-400/60 hover:text-white',
}

const sizeMap: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', asChild = false, ...props },
    ref,
  ) => {
    const styles = clsx(
      'inline-flex items-center gap-2 rounded-lg font-semibold tracking-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400 disabled:cursor-not-allowed disabled:opacity-60',
      variantMap[variant],
      sizeMap[size],
      className,
    )

    if (asChild && isValidElement(props.children)) {
      const child = props.children as ReactElement<{ className?: string }>
      return cloneElement(child, {
        className: clsx(child.props.className, styles),
      })
    }

    return <button ref={ref} className={styles} {...props} />
  },
)

Button.displayName = 'Button'
