import { clsx } from 'clsx'
import { RecipeSection, FieldGroup, SliderInput } from '../shared'
import type { PamConfig } from '../../../../shared/processing'

interface PamTabProps {
  pam: PamConfig
  onChange: (pam: PamConfig) => void
  disabled: boolean
}

export function PamTab({ pam, onChange, disabled }: PamTabProps) {
  const updateField = <K extends keyof PamConfig>(key: K, value: PamConfig[K]) => {
    onChange({ ...pam, [key]: value })
  }

  return (
    <RecipeSection
      title="Real-time pam controls"
      description="These controls update the active processing recipe. Preview refresh is debounced to keep interaction responsive."
    >
      <FieldGroup label="Dedisperse">
        <button
          type="button"
          onClick={() => updateField('dedisperse', !pam.dedisperse)}
          disabled={disabled}
          className={clsx(
            'flex h-11 items-center justify-between rounded-2xl border px-4 transition-colors',
            pam.dedisperse
              ? 'border-accent bg-accent/12 text-accent'
              : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-sm font-medium">
            {pam.dedisperse ? 'Enabled' : 'Disabled'}
          </span>
          <div
            className={clsx(
              'flex h-6 w-11 items-center rounded-full px-1 transition-colors',
              pam.dedisperse ? 'bg-accent' : 'bg-surface-3'
            )}
          >
            <div
              className={clsx(
                'h-4 w-4 rounded-full bg-white transition-transform',
                pam.dedisperse ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </div>
        </button>
      </FieldGroup>

      {([
        ['tscrunchFactor', 'Time scrunch', 1, 16],
        ['fscrunchFactor', 'Frequency scrunch', 1, 16],
        ['bscrunchFactor', 'Bin scrunch', 1, 16]
      ] as const).map(([key, label, min, max]) => (
        <FieldGroup key={key} label={label}>
          <SliderInput
            value={pam[key] as number}
            onChange={(value) => updateField(key as keyof PamConfig, value)}
            min={min}
            max={max}
            step={1}
            disabled={disabled}
          />
        </FieldGroup>
      ))}

      <FieldGroup
        label="Phase rotate (turns)"
        hint="Use fractional turns to align the pulse peak before exporting."
      >
        <SliderInput
          value={pam.phaseRotateTurns}
          onChange={(value) => updateField('phaseRotateTurns', value)}
          min={-0.5}
          max={0.5}
          step={0.005}
          disabled={disabled}
        />
      </FieldGroup>
    </RecipeSection>
  )
}
