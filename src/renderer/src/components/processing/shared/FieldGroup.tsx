import type { ReactNode } from 'react'

interface FieldGroupProps {
  label: string
  hint?: string
  children: ReactNode
}

export function FieldGroup({ label, hint, children }: FieldGroupProps) {
  return (
    <label className="block space-y-2">
      <div>
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
      </div>
      {children}
    </label>
  )
}
