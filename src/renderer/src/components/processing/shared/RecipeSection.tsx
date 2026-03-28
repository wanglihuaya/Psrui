import type { ReactNode } from 'react'

interface RecipeSectionProps {
  title: string
  description: string
  children: ReactNode
  action?: ReactNode
}

export function RecipeSection({ title, description, children, action }: RecipeSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface-0/70">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="space-y-3 px-4 py-4">{children}</div>
    </section>
  )
}
