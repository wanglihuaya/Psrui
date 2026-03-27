import { useRef, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'

const DARK_LAYOUT: Partial<Plotly.Layout> = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: '#0f1420',
  font: {
    family: "'JetBrains Mono', 'SF Mono', monospace",
    size: 11,
    color: '#8b95b0'
  },
  margin: { l: 60, r: 20, t: 40, b: 50 },
  xaxis: {
    gridcolor: '#1e2640',
    zerolinecolor: '#2a3352',
    linecolor: '#2a3352'
  },
  yaxis: {
    gridcolor: '#1e2640',
    zerolinecolor: '#2a3352',
    linecolor: '#2a3352'
  },
  modebar: {
    bgcolor: 'rgba(0,0,0,0)',
    color: '#565f78',
    activecolor: '#5b8def'
  }
}

interface PlotlyWrapperProps {
  data: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
  onPlotlyClick?: (event: Plotly.PlotMouseEvent) => void
  onPlotlySelected?: (event: Plotly.PlotSelectionEvent) => void
}

export function PlotlyWrapper({
  data,
  layout = {},
  config,
  onPlotlyClick,
  onPlotlySelected
}: PlotlyWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<HTMLDivElement | null>(null)

  const mergedLayout: Partial<Plotly.Layout> = {
    ...DARK_LAYOUT,
    ...layout,
    autosize: true,
    xaxis: { ...DARK_LAYOUT.xaxis, ...(layout.xaxis || {}) },
    yaxis: { ...DARK_LAYOUT.yaxis, ...(layout.yaxis || {}) }
  }

  const mergedConfig: Partial<Plotly.Config> = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'sendDataToCloud'],
    scrollZoom: true,
    ...config
  }

  const render = useCallback(() => {
    if (!plotRef.current) return
    Plotly.react(plotRef.current, data, mergedLayout as Plotly.Layout, mergedConfig as Plotly.Config)
  }, [data, mergedLayout, mergedConfig])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const plotDiv = document.createElement('div')
    plotDiv.style.width = '100%'
    plotDiv.style.height = '100%'
    container.appendChild(plotDiv)
    plotRef.current = plotDiv

    Plotly.newPlot(plotDiv, data, mergedLayout as Plotly.Layout, mergedConfig as Plotly.Config)

    if (onPlotlyClick) {
      ;(plotDiv as any).on?.('plotly_click', onPlotlyClick)
    }
    if (onPlotlySelected) {
      ;(plotDiv as any).on?.('plotly_selected', onPlotlySelected)
    }

    const resizeObserver = new ResizeObserver(() => {
      Plotly.Plots.resize(plotDiv)
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      Plotly.purge(plotDiv)
      container.removeChild(plotDiv)
      plotRef.current = null
    }
    // only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPlotlyClick, onPlotlySelected])

  // update data/layout when they change
  useEffect(() => {
    render()
  }, [render])

  return (
    <div
      ref={containerRef}
      className="plotly-chart w-full h-full"
    />
  )
}
