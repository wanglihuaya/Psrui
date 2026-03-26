import { clsx } from 'clsx'
import { Activity, Binary as BinaryIcon, Database, Loader2, Search, Zap } from 'lucide-react'
import Plotly from 'plotly.js-dist-min'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api, PsrcatPulsar, PsrcatStats } from '../../lib/api'

const DARK_THEME = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: '#0f1420',
  font: { color: '#8b95b0', family: 'Inter, system-ui, sans-serif' },
  gridcolor: '#1e2640'
}

const COLORS: Record<string, string> = {
  Normal: '#5b8def',
  MSP: '#5bef8f',
  Binary: '#5bcfef',
  Magnetar: '#ef5b5b',
  Other: '#8b95b0'
}

interface PsrcatViewProps {
  initialHighlight?: string
}

export default function PsrcatView({ initialHighlight = '' }: PsrcatViewProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [pulsars, setPulsars] = useState<PsrcatPulsar[]>([])
  const [stats, setStats] = useState<PsrcatStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(initialHighlight)
  const [highlighted, setHighlighted] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [pulsarData, statsData] = await Promise.all([
          api.getPsrcatPulsars(),
          api.getPsrcatStats()
        ])
        setPulsars(pulsarData)
        setStats(statsData)
      } catch (err) {
        console.error('Failed to fetch PSRCAT data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredPulsars = useMemo(() => {
    if (!search) return pulsars
    const s = search.toLowerCase()
    return pulsars.filter(p => 
      p.PSRJ.toLowerCase().includes(s) || 
      (p.PSRB && p.PSRB.toLowerCase().includes(s))
    )
  }, [pulsars, search])

  // Find the exact match to highlight (also handles partial source names like "J0437-4715")
  useEffect(() => {
    const s = search.trim().toUpperCase()
    if (!s) { setHighlighted(null); return }
    const found = pulsars.find(p =>
      p.PSRJ === s ||
      p.PSRB === s ||
      p.PSRJ.startsWith(s) ||
      (p.PSRB && p.PSRB.startsWith(s))
    )
    setHighlighted(found ? found.PSRJ : null)
  }, [search, pulsars])

  useEffect(() => {
    if (!plotRef.current || loading || pulsars.length === 0) return

    const validPulsars = pulsars.filter(p => p.P0 > 0 && p.P1 > 0)
    
    // Group by class
    const classes = ['Normal', 'MSP', 'Binary', 'Magnetar']
    const traces: Partial<Plotly.PlotData>[] = classes.map(cls => {
      const group = validPulsars.filter(p => p.class === cls)
      return {
        x: group.map(p => p.P0),
        y: group.map(p => p.P1),
        name: cls,
        mode: 'markers',
        type: 'scattergl',
        marker: {
          size: 6,
          color: COLORS[cls] || COLORS.Other,
          opacity: 0.7,
          line: { width: 0.5, color: '#000' }
        },
        text: group.map(p => `${p.PSRJ}<br>P0: ${p.P0.toExponential(3)} s<br>P1: ${p.P1.toExponential(3)}<br>DM: ${p.DM || 'N/A'}<br>Class: ${p.class}`),
        hoverinfo: 'text'
      }
    })

    // Highlight trace
    if (highlighted) {
      const p = validPulsars.find(p => p.PSRJ === highlighted)
      if (p) {
        traces.push({
          x: [p.P0],
          y: [p.P1],
          name: 'Highlighted',
          mode: 'markers',
          type: 'scattergl',
          marker: {
            size: 15,
            color: 'white',
            symbol: 'star',
            line: { width: 2, color: COLORS[p.class] || COLORS.Other }
          },
          text: [`${p.PSRJ} (Selected)`],
          hoverinfo: 'text',
          showlegend: false
        })
      }
    }

    // Helper for constant lines
    const p0Range = [1e-3, 30] // 1ms to 30s
    
    // B-field lines: log(P1) = -log(P0) + 2*log(B) - 2*log(3.2e19)
    const bFields = [1e8, 1e10, 1e12, 1e14]
    bFields.forEach(B => {
      const p1 = p0Range.map(p0 => (B / 3.2e19)**2 / p0)
      traces.push({
        x: p0Range,
        y: p1,
        mode: 'lines',
        line: { color: '#1e2640', width: 1, dash: 'dash' },
        showlegend: false,
        hoverinfo: 'none'
      })
    })

    // Age lines: log(P1) = log(P0) - log(2*tau)
    const ages = [1e3, 1e5, 1e7, 1e9, 1e11] // years
    const SEC_PER_YEAR = 3.15576e7
    ages.forEach(tau => {
      const p1 = p0Range.map(p0 => p0 / (2 * tau * SEC_PER_YEAR))
      traces.push({
        x: p0Range,
        y: p1,
        mode: 'lines',
        line: { color: '#1e2640', width: 1, dash: 'dot' },
        showlegend: false,
        hoverinfo: 'none'
      })
    })

    // Edot lines: log(P1) = 3*log(P0) + log(Edot) - log(3.95e46)
    const edots = [1e30, 1e33, 1e36, 1e39]
    edots.forEach(Edot => {
      const p1 = p0Range.map(p0 => (Edot * Math.pow(p0, 3)) / 3.95e46)
      traces.push({
        x: p0Range,
        y: p1,
        mode: 'lines',
        line: { color: '#1e2640', width: 1, dash: 'solid' },
        showlegend: false,
        hoverinfo: 'none'
      })
    })

    const layout: Partial<Plotly.Layout> = {
      ...DARK_THEME,
      margin: { t: 40, r: 40, b: 60, l: 80 },
      xaxis: {
        title: { text: 'Period P₀ (s)' },
        type: 'log',
        gridcolor: DARK_THEME.gridcolor,
        zeroline: false,
        range: [-3.2, 1.5]
      },
      yaxis: {
        title: { text: 'Period Derivative Ṗ' },
        type: 'log',
        gridcolor: DARK_THEME.gridcolor,
        zeroline: false,
        range: [-22, -8]
      },
      legend: {
        x: 0,
        y: 1,
        bgcolor: 'rgba(15, 20, 32, 0.8)',
        bordercolor: '#1e2640',
        borderwidth: 1
      },
      annotations: [
        ...bFields.map(B => ({
          x: Math.log10(1e-1),
          y: Math.log10((B / 3.2e19)**2 / 1e-1),
          text: `B=10<sup>${Math.log10(B)}</sup> G`,
          showarrow: false,
          font: { size: 10, color: '#4a5568' },
          textangle: '-45'
        })),
        ...ages.map(tau => ({
          x: Math.log10(10),
          y: Math.log10(10 / (2 * tau * SEC_PER_YEAR)),
          text: `τ=10<sup>${Math.log10(tau)}</sup> yr`,
          showarrow: false,
          font: { size: 10, color: '#4a5568' },
          textangle: '45'
        })),
        ...edots.map(Edot => ({
          x: Math.log10(5e-3),
          y: Math.log10((Edot * Math.pow(5e-3, 3)) / 3.95e46),
          text: `Ė=10<sup>${Math.log10(Edot)}</sup>`,
          showarrow: false,
          font: { size: 10, color: '#4a5568' },
          textangle: '70'
        }))
      ] as Partial<Plotly.Annotations>[]
    }

    Plotly.newPlot(plotRef.current, traces as Plotly.Data[], layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d']
    })

    const observer = new ResizeObserver(() => {
      Plotly.Plots.resize(plotRef.current!)
    })
    observer.observe(plotRef.current)

    return () => {
      observer.disconnect()
    }
  }, [loading, pulsars, highlighted])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-0">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-surface-0 text-text-primary">
      {/* Header / Stats Bar */}
      <div className="flex flex-none items-center justify-between border-b border-border bg-surface-1 p-4 flex-wrap gap-y-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-accent shinrk-0" />
            <span className="text-sm font-medium">PSRCAT V1.70</span>
          </div>
          
          <div className="flex items-center gap-3">
            <StatPill icon={<Activity className="h-3 w-3" />} label="Total" count={stats?.total} color="bg-surface-2" />
            <StatPill icon={<Activity className="h-3 w-3 text-blue-400" />} label="Normal" count={stats?.classes?.Normal} color="bg-blue-500/10 text-blue-400 border-blue-500/20" />
            <StatPill icon={<Zap className="h-3 w-3 text-yellow-400" />} label="Magnetars" count={stats?.classes?.Magnetar} color="bg-red-500/10 text-red-400 border-red-500/20" />
            <StatPill icon={<BinaryIcon className="h-3 w-3 text-cyan-400" />} label="Binary" count={stats?.classes?.Binary} color="bg-cyan-500/10 text-cyan-400 border-cyan-500/20" />
            <StatPill icon={<Activity className="h-3 w-3 text-green-400" />} label="MSP" count={stats?.classes?.MSP} color="bg-green-500/10 text-green-400 border-green-500/20" />
          </div>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search pulsar (e.g. J0437-4715)..."
            className="w-full rounded-full border border-border bg-surface-2 py-1.5 pl-10 pr-4 text-sm outline-none ring-accent/20 transition-all focus:border-accent focus:ring-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Plot Area */}
      <div className="relative flex-1 overflow-hidden p-4">
        <div ref={plotRef} className="h-full w-full" />
        
        {/* Plot Legend Overlay (custom) if needed, but Plotly's is fine */}
        <div className="pointer-events-none absolute right-8 top-8 rounded-lg border border-border bg-surface-1/80 p-3 text-xs backdrop-blur-sm">
          <div className="mb-2 font-semibold text-text-secondary uppercase tracking-wider">Parameters</div>
          <div className="space-y-1 text-text-muted">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 border-t border-dashed border-gray-600" />
              <span>B-field (Gauss)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 border-t border-dotted border-gray-600" />
              <span>Age τ (years)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 border-t border-solid border-gray-600" />
              <span>Spin-down Ė (erg/s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatPill({ icon, label, count, color }: { icon: React.ReactNode, label: string, count?: number, color: string }) {
  return (
    <div className={clsx("flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium", color)}>
      {icon}
      <span>{label}:</span>
      <span className="tabular-nums">{count?.toLocaleString() || '0'}</span>
    </div>
  )
}
