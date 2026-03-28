interface SliderInputProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  disabled?: boolean
}

export function SliderInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false
}: SliderInputProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
        className="h-2 flex-1 accent-accent disabled:opacity-50"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value)
          if (!Number.isNaN(nextValue)) {
            onChange(Math.max(min, Math.min(max, nextValue)))
          }
        }}
        disabled={disabled}
        className="w-20 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden disabled:opacity-50"
      />
    </div>
  )
}
