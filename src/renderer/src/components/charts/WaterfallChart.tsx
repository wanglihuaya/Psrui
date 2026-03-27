import { useAtomValue } from 'jotai'
import { waterfallDataAtom, metadataAtom } from '@/lib/store'
import { settingsAtom } from '@/lib/settings'
import { PlotlyWrapper } from './PlotlyWrapper'
import type { ProcessingRecipe } from '../../../../shared/processing'

type RecipeUpdate = ProcessingRecipe | ((prev: ProcessingRecipe) => ProcessingRecipe)

interface WaterfallChartProps {
  onApplyProcessingRecipe: (
    update: RecipeUpdate,
    options?: {
      pushHistory?: boolean
      resetToa?: boolean
    }
  ) => Promise<void>
}

function normalizeChannel(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  const parsed = Number(value)
  if (Number.isFinite(parsed)) {
    return Math.max(0, Math.round(parsed))
  }

  return null
}

export function WaterfallChart({ onApplyProcessingRecipe }: WaterfallChartProps) {
  const data = useAtomValue(waterfallDataAtom)
  const metadata = useAtomValue(metadataAtom)
  const settings = useAtomValue(settingsAtom)

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
        Load an archive to see the frequency-phase waterfall
      </div>
    )
  }

  const yLabel = metadata
    ? `Frequency (${metadata.freq_lo.toFixed(0)}–${metadata.freq_hi.toFixed(0)} MHz)`
    : 'Channel'

  const traces: Plotly.Data[] = [
    {
      z: data.intensities,
      x: data.phase,
      y: data.channels,
      type: 'heatmap',
      colorscale: settings.chartColorscale,
      colorbar: {
        title: { text: 'Intensity', font: { size: 10 } },
        tickfont: { size: 9 },
        thickness: 12
      },
      hoverongaps: false,
      hovertemplate: 'Phase: %{x:.3f}<br>Ch: %{y}<br>I: %{z:.2f}<extra></extra>'
    }
  ]

  return (
    <PlotlyWrapper
      data={traces}
      config={{
        modeBarButtonsToRemove: ['lasso2d', 'sendDataToCloud']
      }}
      layout={{
        title: { text: 'Frequency × Phase', font: { size: 13, color: '#e8ecf4' } },
        xaxis: { title: { text: 'Phase' }, range: [0, 1] },
        yaxis: { title: { text: yLabel } },
        dragmode: 'select'
      }}
      onPlotlyClick={(event) => {
        const channel = normalizeChannel(event.points?.[0]?.y)
        if (channel === null) return

        void onApplyProcessingRecipe((prev) => {
          const nextChannels = prev.zap.channels.includes(channel)
            ? prev.zap.channels.filter((value) => value !== channel)
            : [...prev.zap.channels, channel].sort((a, b) => a - b)

          return {
            ...prev,
            zap: {
              channels: nextChannels
            }
          }
        })
      }}
      onPlotlySelected={(event) => {
        const selectedChannels = new Set<number>()
        const plotlyEvent = event as Plotly.PlotSelectionEvent & {
          range?: {
            y?: [number, number]
          }
        }

        plotlyEvent.points?.forEach((point) => {
          const channel = normalizeChannel(point.y)
          if (channel !== null) {
            selectedChannels.add(channel)
          }
        })

        if (selectedChannels.size === 0 && Array.isArray(plotlyEvent.range?.y)) {
          const [start, end] = plotlyEvent.range.y
          const from = Math.max(0, Math.floor(Math.min(start, end)))
          const to = Math.max(0, Math.ceil(Math.max(start, end)))
          for (let channel = from; channel <= to; channel += 1) {
            selectedChannels.add(channel)
          }
        }

        if (selectedChannels.size === 0) return

        void onApplyProcessingRecipe((prev) => {
          const merged = new Set(prev.zap.channels)
          selectedChannels.forEach((channel) => merged.add(channel))
          return {
            ...prev,
            zap: {
              channels: Array.from(merged).sort((a, b) => a - b)
            }
          }
        })
      }}
    />
  )
}
