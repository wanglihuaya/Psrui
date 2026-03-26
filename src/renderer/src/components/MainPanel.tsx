import { useAtom, useAtomValue } from 'jotai'
import {
  activeTabAtom,
  currentFileAtom,
  loadingAtom,
  errorAtom,
  splitLayoutAtom,
  splitSlotsAtom,
  type ViewTab,
  type SplitLayout,
  type SplitSlot
} from '@/lib/store'
import { ProfileChart } from './charts/ProfileChart'
import { WaterfallChart } from './charts/WaterfallChart'
import { TimePhaseChart } from './charts/TimePhaseChart'
import { BandpassChart } from './charts/BandpassChart'
import {
  Radio,
  Loader2,
  AlertCircle,
  Columns2,
  Rows2,
  LayoutGrid,
  Square,
  ChevronDown
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

const CHART_TABS: { id: ViewTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'waterfall', label: 'Freq × Phase' },
  { id: 'time-phase', label: 'Time × Phase' },
  { id: 'bandpass', label: 'Bandpass' }
]

const LAYOUT_OPTIONS: { id: SplitLayout; icon: any; label: string }[] = [
  { id: 'single', icon: Square, label: 'Single' },
  { id: 'horizontal', icon: Columns2, label: '2 Columns' },
  { id: 'vertical', icon: Rows2, label: '2 Rows' },
  { id: 'grid', icon: LayoutGrid, label: '2×2 Grid' }
]

function ChartRenderer({ tab }: { tab: ViewTab }) {
  if (tab === 'profile') return <ProfileChart />
  if (tab === 'waterfall') return <WaterfallChart />
  if (tab === 'time-phase') return <TimePhaseChart />
  if (tab === 'bandpass') return <BandpassChart />
  return null
}

// Per-slot tab bar so users can switch what each pane shows
function SlotHeader({
  slot,
  index,
  onChangeSlot
}: {
  slot: SplitSlot
  index: number
  onChangeSlot: (index: number, tab: SplitSlot) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = CHART_TABS.find(t => t.id === slot)

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 bg-surface-1 border-b border-border shrink-0"
      ref={ref}
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        {current?.label}
        <ChevronDown className={clsx('w-3 h-3 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 z-50 top-full w-40 bg-surface-2 border border-border rounded-md shadow-xl py-1">
          {CHART_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { onChangeSlot(index, tab.id); setOpen(false) }}
              className={clsx(
                'w-full flex items-center px-3 py-1.5 text-xs text-left transition-colors',
                tab.id === slot
                  ? 'text-accent bg-accent/10'
                  : 'text-text-secondary hover:bg-surface-3'
              )}
            >
              {tab.label}
              {tab.id === slot && <span className="ml-auto text-accent">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LayoutPicker() {
  const [layout, setLayout] = useAtom(splitLayoutAtom)
  return (
    <div className="flex items-center gap-0.5 ml-2">
      {LAYOUT_OPTIONS.map(opt => {
        const Icon = opt.icon
        return (
          <button
            key={opt.id}
            onClick={() => setLayout(opt.id)}
            title={opt.label}
            className={clsx(
              'p-1.5 rounded transition-colors',
              layout === opt.id
                ? 'text-accent bg-accent/10'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        )
      })}
    </div>
  )
}

export function MainPanel() {
  const [activeTab, setActiveTab] = useAtom(activeTabAtom)
  const [layout] = useAtom(splitLayoutAtom)
  const [slots, setSlots] = useAtom(splitSlotsAtom)
  const currentFile = useAtomValue(currentFileAtom)
  const loading = useAtomValue(loadingAtom)
  const error = useAtomValue(errorAtom)

  const changeSlot = (index: number, tab: SplitSlot) => {
    setSlots(prev => {
      const next = [...prev]
      next[index] = tab
      return next
    })
  }

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-surface-0">
        <Radio className="w-16 h-16 text-surface-3" strokeWidth={1} />
        <div className="text-center">
          <h2 className="text-lg font-medium text-text-secondary">No Archive Loaded</h2>
          <p className="text-sm text-text-muted mt-1">Open a pulsar archive file to begin analysis</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-0 overflow-hidden">
      {/* Tab bar + Layout picker */}
      <div className="flex items-center px-4 pt-2 pb-0 border-b border-border shrink-0 bg-surface-0">
        <div className="flex items-center gap-0.5 flex-1">
          {layout === 'single' &&
            CHART_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'px-3 py-2 text-xs font-medium rounded-t transition-colors',
                  activeTab === tab.id
                    ? 'text-accent border-b-2 border-accent bg-surface-2/50'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-1'
                )}
              >
                {tab.label}
              </button>
            ))}
          {layout !== 'single' && (
            <span className="text-xs text-text-muted px-2 py-2">
              Split view — select views per pane
            </span>
          )}
        </div>
        <LayoutPicker />
      </div>

      {/* Chart area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-0/80 z-10">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        )}
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-0/80 z-10">
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Single */}
        {layout === 'single' && (
          <div className="w-full h-full p-2">
            <ChartRenderer tab={activeTab} />
          </div>
        )}

        {/* 2 Columns */}
        {layout === 'horizontal' && (
          <div className="flex w-full h-full">
            {[0, 1].map(i => (
              <div key={i} className={clsx('flex flex-col overflow-hidden flex-1', i === 0 && 'border-r border-border')}>
                <div className="relative">
                  <SlotHeader slot={slots[i]} index={i} onChangeSlot={changeSlot} />
                </div>
                <div className="flex-1 p-2 overflow-hidden">
                  <ChartRenderer tab={slots[i]} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2 Rows */}
        {layout === 'vertical' && (
          <div className="flex flex-col w-full h-full">
            {[0, 1].map(i => (
              <div key={i} className={clsx('flex flex-col overflow-hidden flex-1', i === 0 && 'border-b border-border')}>
                <div className="relative">
                  <SlotHeader slot={slots[i]} index={i} onChangeSlot={changeSlot} />
                </div>
                <div className="flex-1 p-2 overflow-hidden">
                  <ChartRenderer tab={slots[i]} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2×2 Grid */}
        {layout === 'grid' && (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={clsx(
                  'flex flex-col overflow-hidden',
                  i % 2 === 0 && 'border-r border-border',
                  i < 2 && 'border-b border-border'
                )}
              >
                <div className="relative">
                  <SlotHeader slot={slots[i]} index={i} onChangeSlot={changeSlot} />
                </div>
                <div className="flex-1 p-1 overflow-hidden">
                  <ChartRenderer tab={slots[i]} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
