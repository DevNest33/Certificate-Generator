import { CircleCheck, CircleX, Info, LoaderCircle, X, type LucideIcon } from 'lucide-react'
import {
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import type { Toast } from '../hooks/useToasts'

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ')

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  icon?: LucideIcon
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      )}
      {children}
    </button>
  )
}

export function Tooltip({
  label,
  align = 'center',
  side = 'bottom',
  children,
}: {
  label: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom'
  children: ReactNode
}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cx(
          'pointer-events-none absolute z-50 w-max max-w-64 rounded-md bg-slate-900 px-2 py-1 text-xs leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity group-focus-within/tip:opacity-100 group-hover/tip:opacity-100 group-hover/tip:delay-300',
          side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'start' && 'left-0',
          align === 'end' && 'right-0',
        )}
      >
        {label}
      </span>
    </span>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: LucideIcon
  active?: boolean
  tooltipAlign?: 'start' | 'center' | 'end'
  tooltipSide?: 'top' | 'bottom'
}

export function IconButton({
  label,
  icon: Icon,
  active,
  tooltipAlign,
  tooltipSide,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip label={label} align={tooltipAlign} side={tooltipSide}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        className={cx(
          'inline-flex size-8 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:text-slate-300',
          active ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          className,
        )}
        {...props}
      >
        <Icon className="size-4" />
      </button>
    </Tooltip>
  )
}

export const inputClass =
  'h-8 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400'

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...props} />
}

export function SelectInput({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputClass, 'pr-7', className)} {...props}>
      {children}
    </select>
  )
}

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onValueChange: (value: number) => void
  decimals?: number
}

/** Keeps the typed text while focused so partial input like "-" or "1." is not rejected. */
export function NumberInput({ value, onValueChange, decimals = 1, min, max, className, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const factor = 10 ** decimals
  const shown = draft ?? String(Math.round(value * factor) / factor)
  return (
    <input
      type="number"
      inputMode="decimal"
      value={shown}
      min={min}
      max={max}
      className={cx(inputClass, 'tabular-nums', className)}
      onChange={(e) => {
        setDraft(e.target.value)
        const parsed = Number.parseFloat(e.target.value)
        if (!Number.isFinite(parsed)) return
        let next = parsed
        if (min !== undefined) next = Math.max(Number(min), next)
        if (max !== undefined) next = Math.min(Number(max), next)
        onValueChange(next)
      }}
      onBlur={() => setDraft(null)}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  group,
  children,
  className,
}: {
  label: string
  hint?: ReactNode
  /** For anything but a single input or select: clicking a label activates its first control, even a button. */
  group?: boolean
  children: ReactNode
  className?: string
}) {
  const labelId = useId()
  const Wrapper = group ? 'div' : 'label'
  return (
    <Wrapper role={group ? 'group' : undefined} aria-labelledby={group ? labelId : undefined} className={cx('block min-w-0', className)}>
      <span id={labelId} className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </Wrapper>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50',
          checked ? 'bg-blue-600' : 'bg-slate-300',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </label>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T
  options: { value: T; label: string; icon: LucideIcon }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-xs">
      {options.map((option) => (
        <Tooltip key={option.value} label={option.label}>
          <button
            type="button"
            aria-label={option.label}
            aria-pressed={value === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex h-7 w-8 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              value === option.value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <option.icon className="size-4" />
          </button>
        </Tooltip>
      ))}
    </div>
  )
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white shadow-xs', className)}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'blue' | 'amber' | 'red' | 'green'; children: ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <span className={cx('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] leading-none font-medium', tones[tone])}>
      {children}
    </span>
  )
}

export function Modal({
  open,
  title,
  description,
  onClose,
  footer,
  size = 'md',
  children,
}: {
  open: boolean
  title: string
  description?: ReactNode
  onClose: () => void
  footer?: ReactNode
  size?: 'sm' | 'md' | 'xl'
  children: ReactNode
}) {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', xl: 'max-w-6xl' }
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx('flex max-h-[90vh] w-full flex-col rounded-xl bg-white shadow-2xl', widths[size])}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <IconButton label="Close" icon={X} onClick={onClose} tooltipAlign="end" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-slate-50 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

export interface ConfirmOptions {
  title: string
  message: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
}

export function ConfirmDialog({
  options,
  onResolve,
}: {
  options: ConfirmOptions | null
  onResolve: (confirmed: boolean) => void
}) {
  return (
    <Modal
      open={!!options}
      size="sm"
      title={options?.title ?? ''}
      onClose={() => onResolve(false)}
      footer={
        <>
          <Button onClick={() => onResolve(false)}>Cancel</Button>
          <Button variant={options?.tone ?? 'danger'} onClick={() => onResolve(true)} autoFocus>
            {options?.confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600">{options?.message}</div>
    </Modal>
  )
}

const toastStyles = {
  success: { icon: CircleCheck, className: 'border-emerald-200 text-emerald-900', iconClass: 'text-emerald-600' },
  error: { icon: CircleX, className: 'border-red-200 text-red-900', iconClass: 'text-red-600' },
  info: { icon: Info, className: 'border-blue-200 text-slate-800', iconClass: 'text-blue-600' },
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return createPortal(
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => {
        const style = toastStyles[toast.tone]
        return (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cx('pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-white px-3.5 py-3 text-sm shadow-lg', style.className)}
          >
            <style.icon className={cx('mt-0.5 size-4 shrink-0', style.iconClass)} />
            <p className="min-w-0 flex-1">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-slate-400 hover:text-slate-600"
              onClick={() => onDismiss(toast.id)}
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}
