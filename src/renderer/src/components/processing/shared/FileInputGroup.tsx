import { FolderOpen } from 'lucide-react'

interface FileInputGroupProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  onChoose: () => void
  buttonLabel?: string
  disabled?: boolean
}

export function FileInputGroup({
  value,
  onChange,
  placeholder,
  onChoose,
  buttonLabel = 'Choose',
  disabled = false
}: FileInputGroupProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onChoose}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FolderOpen className="h-4 w-4" />
        {buttonLabel}
      </button>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-w-0 flex-1 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden disabled:opacity-50"
      />
    </div>
  )
}
