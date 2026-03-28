import { clsx } from 'clsx'

interface ToggleButtonProps {
  enabled: boolean
  onClick: () => void
  label: string
  description?: string
  disabled?: boolean
}

export function ToggleButton({ enabled, onClick, label, description, disabled = false }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'rounded-2xl border px-4 py-3 text-left transition-colors',
        enabled
          ? 'border-accent bg-accent/12 text-accent'
          : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="text-sm font-medium">{label}</div>
      {description ? <div className="mt-1 text-xs text-text-muted">{description}</div> : null}
    </button>
  )
}
