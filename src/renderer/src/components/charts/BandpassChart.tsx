import { useAtomValue } from 'jotai'
import { bandpassDataAtom } from '@/lib/store'
import { settingsAtom } from '@/lib/settings'
import { PlotlyWrapper } from './PlotlyWrapper'
import { getColorscaleColors } from '@/lib/colorscale'

export function BandpassChart() {
  const data = useAtomValue(bandpassDataAtom)
  const settings = useAtomValue(settingsAtom)
  const [, , , cAccent] = getColorscaleColors(settings.chartColorscale)

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
        Load an archive to see the bandpass
      </div>
    )
  }

  const traces: Plotly.Data[] = [
    {
      x: data.channels,
      y: data.intensities,
      type: 'scatter',
      mode: 'lines',
      name: 'Mean Intensity',
      line: { color: cAccent, width: 1.5 }
    }
  ]

  return (
    <PlotlyWrapper
      data={traces}
      layout={{
        title: { text: 'Bandpass (Mean Intensity)', font: { size: 13, color: '#e8ecf4' } },
        xaxis: { title: { text: 'Frequency (MHz)' } },
        yaxis: { title: { text: 'Mean Intensity' } },
        legend: {
          x: 1,
          y: 1,
          xanchor: 'right',
          bgcolor: 'rgba(15,20,32,0.8)',
          font: { size: 10 }
        },
        hovermode: 'x unified'
      }}
    />
  )
}
