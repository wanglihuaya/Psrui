import { useAtomValue } from 'jotai'
import { waterfallDataAtom, metadataAtom } from '@/lib/store'
import { settingsAtom } from '@/lib/settings'
import { PlotlyWrapper } from './PlotlyWrapper'

export function WaterfallChart() {
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
      layout={{
        title: { text: 'Frequency × Phase', font: { size: 13, color: '#e8ecf4' } },
        xaxis: { title: { text: 'Phase' }, range: [0, 1] },
        yaxis: { title: { text: yLabel } }
      }}
    />
  )
}
