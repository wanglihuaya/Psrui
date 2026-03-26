import { useAtomValue } from 'jotai'
import { profileDataAtom } from '@/lib/store'
import { settingsAtom } from '@/lib/settings'
import { PlotlyWrapper } from './PlotlyWrapper'
import { getColorscaleColors } from '@/lib/colorscale'

export function ProfileChart() {
  const data = useAtomValue(profileDataAtom)
  const settings = useAtomValue(settingsAtom)
  const [cI, cQ, cU, cV] = getColorscaleColors(settings.chartColorscale)

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
        Load an archive to see the pulse profile
      </div>
    )
  }

  const traces: Plotly.Data[] = [
    {
      x: data.phase,
      y: data.intensity,
      type: 'scatter',
      mode: 'lines',
      name: 'Total Intensity (I)',
      line: { color: cI, width: 1.5 }
    }
  ]

  if (data.stokes_q) {
    traces.push({
      x: data.phase,
      y: data.stokes_q,
      type: 'scatter',
      mode: 'lines',
      name: 'Stokes Q',
      line: { color: cQ, width: 1 },
      visible: 'legendonly'
    })
  }

  if (data.stokes_u) {
    traces.push({
      x: data.phase,
      y: data.stokes_u,
      type: 'scatter',
      mode: 'lines',
      name: 'Stokes U',
      line: { color: cU, width: 1 },
      visible: 'legendonly'
    })
  }

  if (data.stokes_v) {
    traces.push({
      x: data.phase,
      y: data.stokes_v,
      type: 'scatter',
      mode: 'lines',
      name: 'Stokes V',
      line: { color: cV, width: 1 },
      visible: 'legendonly'
    })
  }

  return (
    <PlotlyWrapper
      data={traces}
      layout={{
        title: { text: 'Pulse Profile', font: { size: 13, color: '#e8ecf4' } },
        xaxis: { title: { text: 'Phase' }, range: [0, 1] },
        yaxis: { title: { text: 'Intensity (arbitrary)' } },
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
