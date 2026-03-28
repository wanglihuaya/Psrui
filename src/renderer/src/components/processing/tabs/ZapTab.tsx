import { RecipeSection } from '../shared'

interface ZapTabProps {
  channels: number[]
  nchan: number | undefined
  onClear: () => void
  onRemoveChannel: (channel: number) => void
}

export function ZapTab({ channels, nchan, onClear, onRemoveChannel }: ZapTabProps) {
  return (
    <RecipeSection
      title="Interactive channel zapping"
      description="Click a channel in the waterfall to toggle it, or switch the chart toolbar to box select and drag across a channel range."
      action={
        <button
          type="button"
          onClick={onClear}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
        >
          Clear
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Zapped channels</div>
          <div className="mt-2 text-xl font-semibold text-text-primary">
            {channels.length}
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Archive channels</div>
          <div className="mt-2 text-xl font-semibold text-text-primary">
            {nchan ?? 'N/A'}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-3 py-3">
        {channels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => onRemoveChannel(channel)}
                className="rounded-full border border-accent/40 bg-accent/12 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/18"
              >
                Ch {channel}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-text-muted">
            No channels zapped yet. Use the waterfall plot to mark RFI-contaminated channels.
          </div>
        )}
      </div>
    </RecipeSection>
  )
}
