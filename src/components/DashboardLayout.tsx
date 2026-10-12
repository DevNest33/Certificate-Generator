import { Award, LayoutTemplate, RotateCcwClock, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Section } from '../types'

const NAV: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'generator', label: 'Certificate Generator', icon: Award },
  { id: 'template', label: 'Template Settings', icon: LayoutTemplate },
  { id: 'recipients', label: 'Recipient Data', icon: Users },
  { id: 'history', label: 'Export History', icon: RotateCcwClock },
]

interface Props {
  section: Section
  onSectionChange: (section: Section) => void
  counts: Partial<Record<Section, number>>
  header: ReactNode
  aside?: ReactNode
  children: ReactNode
}

export function DashboardLayout({ section, onSectionChange, counts, header, aside, children }: Props) {
  const title = NAV.find((n) => n.id === section)?.label
  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex size-7 items-center justify-center rounded-md bg-blue-600">
            <Award className="size-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-900">Certificate Generator</span>
        </div>
        <nav className="space-y-0.5 p-3">
          {NAV.map((item) => {
            const active = item.id === section
            const count = counts[item.id]
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`size-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                {item.label}
                {!!count && (
                  <span className="ml-auto rounded-full bg-slate-100 px-1.5 text-[11px] font-medium text-slate-600 tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
        <p className="mt-auto flex items-start gap-2 px-5 py-4 text-xs text-slate-500">
          <ShieldCheck className="mt-px size-3.5 shrink-0 text-emerald-600" />
          Recipient data and templates stay in this browser.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5">
          <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
          <div className="ml-auto">{header}</div>
        </header>
        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">{children}</main>
          {aside && <aside className="w-80 shrink-0 overflow-y-auto border-l border-slate-200 bg-white">{aside}</aside>}
        </div>
      </div>
    </div>
  )
}
