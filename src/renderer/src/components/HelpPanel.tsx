import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { helpOpenAtom, helpSectionAtom } from '@/lib/store'
import { settingsAtom } from '@/lib/settings'
import { SHORTCUTS } from '@/lib/shortcuts'
import { HelpCircle, X, MousePointer2, Activity, Waves, Clock, Radio, Globe, FolderOpen, Settings, Tag, Layout } from 'lucide-react'
import { clsx } from 'clsx'

export function HelpButton() {
  const [, setOpen] = useAtom(helpOpenAtom)
  const setSection = useSetAtom(helpSectionAtom)
  return (
    <button
      onClick={() => {
        setSection('views')
        setOpen(true)
      }}
      className="p-1 hover:bg-surface-2 rounded text-text-muted hover:text-text-secondary transition-colors"
      title="Help"
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  )
}

export function HelpPanel() {
  const [open, setOpen] = useAtom(helpOpenAtom)
  const [activeTab, setActiveTab] = useAtom(helpSectionAtom)
  const settings = useAtomValue(settingsAtom)
  const lang = settings.language

  if (!open) return null

  const tabs: { id: 'views' | 'shortcuts' | 'ui'; label: string }[] = [
    { id: 'views', label: lang === 'zh' ? '视图说明' : 'View Guide' },
    { id: 'shortcuts', label: lang === 'zh' ? '快捷键' : 'Shortcuts' },
    { id: 'ui', label: lang === 'zh' ? '界面操作' : 'UI Guide' }
  ]

  return (
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative bg-surface-1 border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-accent" />
            <h2 className="text-base font-semibold text-text-primary">
              {lang === 'zh' ? '帮助与说明' : 'Help & Documentation'}
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-surface-2'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
          {activeTab === 'views' && <ViewsGuide lang={lang} />}
          {activeTab === 'shortcuts' && <ShortcutsGuide lang={lang} />}
          {activeTab === 'ui' && <UIGuide lang={lang} />}
        </div>
      </div>
    </div>
  )
}

// ─── View Guide ───────────────────────────────────────────────────────────────

function ViewsGuide({ lang }: { lang: string }) {
  const views = [
    {
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      title: 'Profile',
      titleZh: '脉冲轮廓图',
      meaning: 'Shows the integrated pulse profile (Stokes I, Q, U, V) as a function of pulse phase (0–1). This is the fundamental measurement of a pulsar — its characteristic pulse shape averaged over all sub-integrations and frequency channels.',
      meaningZh: '显示积分脉冲轮廓（Stokes I/Q/U/V）随脉冲相位（0–1）的变化。这是脉冲星的基本测量量——跨所有子积分和频率通道平均后的特征脉冲形状。',
      ops: [
        { action: 'Zoom', desc: 'Click and drag to zoom into a phase range' },
        { action: 'Pan', desc: 'Hold Shift and drag to pan along phase axis' },
        { action: 'Hover', desc: 'Hover over curve to see exact intensity and phase values' },
        { action: 'Reset', desc: 'Double-click to reset the view' },
        { action: 'Legend', desc: 'Click legend items to toggle Stokes components' }
      ],
      opsZh: [
        { action: '缩放', desc: '点击并拖拽以缩放相位范围' },
        { action: '平移', desc: '按住 Shift 拖拽沿相位轴平移' },
        { action: '悬停', desc: '鼠标悬停查看精确强度和相位值' },
        { action: '重置', desc: '双击重置视图' },
        { action: '图例', desc: '点击图例项目切换 Stokes 分量' }
      ]
    },
    {
      icon: Waves,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      title: 'Freq × Phase (Waterfall)',
      titleZh: '频率 × 相位（瀑布图）',
      meaning: 'A 2D heatmap of intensity as a function of radio frequency (Y-axis, MHz) and pulse phase (X-axis). Used to visualize dispersion sweep, frequency-dependent pulse broadening, and RFI contamination across the band.',
      meaningZh: '二维热图，显示强度随射电频率（Y 轴，MHz）和脉冲相位（X 轴）的变化。用于可视化色散扫描、频率相关的脉冲展宽以及射频干扰（RFI）污染情况。',
      ops: [
        { action: 'Zoom', desc: 'Box-select any region to zoom in on freq-phase space' },
        { action: 'Colorbar', desc: 'Intensity scale shown on the right — warmer = stronger signal' },
        { action: 'Hover', desc: 'Hover to see frequency (MHz), phase, and intensity' },
        { action: 'RFI', desc: 'Bright horizontal stripes indicate RFI-contaminated channels' },
        { action: 'Dispersion', desc: 'Diagonal sweep in unscrunched data indicates residual DM offset' }
      ],
      opsZh: [
        { action: '缩放', desc: '框选任意区域放大频率-相位空间' },
        { action: '色标', desc: '右侧显示强度色标——越暖越强' },
        { action: '悬停', desc: '悬停查看频率（MHz）、相位和强度' },
        { action: 'RFI', desc: '明亮的水平条纹表示受 RFI 污染的通道' },
        { action: '色散', desc: '未消色散数据中的对角扫描表示残余 DM 偏移' }
      ]
    },
    {
      icon: Clock,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      title: 'Time × Phase',
      titleZh: '时间 × 相位',
      meaning: 'A 2D heatmap of intensity as a function of sub-integration index (Y-axis) and pulse phase (X-axis). Shows how the pulse evolves over time — useful for detecting pulse jitter, scintillation, RFI events, and signal dropouts.',
      meaningZh: '二维热图，显示强度随子积分索引（Y 轴）和脉冲相位（X 轴）的变化。显示脉冲如何随时间演化——用于检测脉冲抖动、闪烁、RFI 事件和信号丢失。',
      ops: [
        { action: 'Zoom', desc: 'Box-select to zoom into specific time ranges and phases' },
        { action: 'Hover', desc: 'Hover to see sub-integration index, phase, and intensity' },
        { action: 'Jitter', desc: 'Phase-offset bright spots indicate individual pulse jitter' },
        { action: 'Scintillation', desc: 'Vertical brightness variation indicates interstellar scintillation' },
        { action: 'Dropouts', desc: 'Dark horizontal rows indicate excised or dropped sub-integrations' }
      ],
      opsZh: [
        { action: '缩放', desc: '框选以放大特定时间范围和相位' },
        { action: '悬停', desc: '悬停查看子积分索引、相位和强度' },
        { action: '抖动', desc: '相位偏移的亮点表示单个脉冲抖动' },
        { action: '闪烁', desc: '垂直亮度变化表示星际闪烁' },
        { action: '丢失', desc: '暗色水平行表示被剔除或丢失的子积分' }
      ]
    },
    {
      icon: Radio,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      title: 'Bandpass',
      titleZh: '带通图',
      meaning: 'Shows the mean signal intensity as a function of frequency channel (MHz). Reveals the shape of the receiver bandpass, identifies bad or flagged channels, and shows signal-to-noise variation across the observing band.',
      meaningZh: '显示平均信号强度随频率通道（MHz）的变化。揭示接收机带通形状，识别坏通道或标记通道，并显示整个观测带内的信噪比变化。',
      ops: [
        { action: 'Zoom', desc: 'Click and drag to zoom into frequency ranges of interest' },
        { action: 'Hover', desc: 'Hover over each channel to see exact frequency and intensity' },
        { action: 'Bad channels', desc: 'Spikes or deep nulls indicate RFI or flagged channels' },
        { action: 'Rolloff', desc: 'Edge rolloff at band edges is expected from the analog filter' },
        { action: 'Reset', desc: 'Double-click to reset zoom' }
      ],
      opsZh: [
        { action: '缩放', desc: '点击并拖拽以放大感兴趣的频率范围' },
        { action: '悬停', desc: '悬停在每个通道上查看精确频率和强度' },
        { action: '坏通道', desc: '尖峰或深零点表示 RFI 或标记通道' },
        { action: '边缘滚降', desc: '带边缘的滚降是模拟滤波器的正常现象' },
        { action: '重置', desc: '双击重置缩放' }
      ]
    }
  ]

  return (
    <div className="space-y-5">
      <p className="text-xs text-text-muted">
        {lang === 'zh'
          ? '每个视图展示了脉冲星数据的不同维度。所有图表均支持 Plotly 交互操作（缩放、平移、悬停）。'
          : 'Each view presents a different dimension of pulsar archive data. All charts support Plotly interactions (zoom, pan, hover).'}
      </p>

      {views.map(view => {
        const Icon = view.icon
        const ops = lang === 'zh' ? view.opsZh : view.ops
        return (
          <div key={view.title} className="rounded-xl border border-border overflow-hidden">
            <div className={clsx('flex items-center gap-2 px-4 py-3', view.bg)}>
              <Icon className={clsx('w-4 h-4 shrink-0', view.color)} />
              <span className="font-semibold text-sm text-text-primary">
                {lang === 'zh' ? view.titleZh : view.title}
              </span>
            </div>
            <div className="px-4 py-3 bg-surface-0/50 space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                {lang === 'zh' ? view.meaningZh : view.meaning}
              </p>
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                  {lang === 'zh' ? '交互操作' : 'Interactions'}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {ops.map(op => (
                    <div key={op.action} className="flex gap-2 text-xs">
                      <span className="font-medium text-accent shrink-0 w-20">{op.action}</span>
                      <span className="text-text-muted">{op.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Split View tip */}
      <div className="rounded-xl border border-border bg-surface-0/50 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Layout className="w-4 h-4 text-accent" />
          <span className="font-semibold text-sm text-text-primary">
            {lang === 'zh' ? '分屏视图' : 'Split View'}
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          {lang === 'zh'
            ? '使用主面板右上角的布局图标切换单图/双列/双行/四格网格分屏。每个分屏格子可独立选择显示哪种图表，方便同时对比多个维度。'
            : 'Use the layout icons in the top-right of the main panel to switch between single, 2-column, 2-row, and 2×2 grid layouts. Each pane can independently display any chart type for simultaneous comparison.'}
        </p>
      </div>
    </div>
  )
}

// ─── Shortcuts Guide ──────────────────────────────────────────────────────────

function ShortcutsGuide({ lang }: { lang: string }) {
  const grouped = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
    const cat = s.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const categoryLabels: Record<string, [string, string]> = {
    file: ['File', '文件'],
    view: ['View', '视图'],
    edit: ['Edit', '编辑'],
    tools: ['Tools', '工具'],
    app: ['App', '应用']
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([cat, shortcuts]) => (
        <div key={cat}>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
            {lang === 'zh' ? (categoryLabels[cat]?.[1] ?? cat) : (categoryLabels[cat]?.[0] ?? cat)}
          </p>
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {shortcuts.map(s => (
              <div key={s.label} className="flex items-center justify-between px-4 py-2.5 bg-surface-0/50 hover:bg-surface-2/30 transition-colors">
                <div>
                  <span className="text-xs font-medium text-text-secondary">
                    {lang === 'zh' ? s.labelZh : s.label}
                  </span>
                  {(lang === 'zh' ? s.descriptionZh : s.description) && (
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {lang === 'zh' ? s.descriptionZh : s.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  {s.key && (
                    <>
                      {s.meta && <kbd className="px-1.5 py-0.5 text-[10px] bg-surface-2 border border-border rounded font-mono">⌘</kbd>}
                      {s.shift && <kbd className="px-1.5 py-0.5 text-[10px] bg-surface-2 border border-border rounded font-mono">⇧</kbd>}
                      {s.alt && <kbd className="px-1.5 py-0.5 text-[10px] bg-surface-2 border border-border rounded font-mono">⌥</kbd>}
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-surface-2 border border-border rounded font-mono uppercase">{s.key}</kbd>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── UI Guide ─────────────────────────────────────────────────────────────────

function UIGuide({ lang: _lang }: { lang: string }) {
  const lang = _lang

  const items = [
    {
      icon: FolderOpen,
      title: 'Explorer (Files)',
      titleZh: '资源管理器（文件）',
      desc: 'Click the folder icon in the sidebar rail to open the file explorer. Open a workspace folder to see its entire directory tree. Click any .ar/.fits file to load it. Right-click for the context menu.',
      descZh: '点击侧边栏图标栏中的文件夹图标打开资源管理器。打开工作区文件夹以查看完整目录树。点击任意 .ar/.fits 文件加载它。右键点击打开上下文菜单。'
    },
    {
      icon: Globe,
      title: 'PSRCAT Catalogue',
      titleZh: 'PSRCAT 目录',
      desc: 'Click the globe icon to open the full-screen PSRCAT P–Ṗ diagram with 3000+ pulsars. Use the search box to highlight a specific pulsar by J-name or B-name. Press Escape to close.',
      descZh: '点击地球图标打开全屏 PSRCAT P–Ṗ 图，包含 3000+ 脉冲星。使用搜索框通过 J 名或 B 名高亮特定脉冲星。按 Escape 关闭。'
    },
    {
      icon: Tag,
      title: 'Labels',
      titleZh: '标签',
      desc: 'Labels let you tag archive files for easy filtering. Create labels in the Labels section of the sidebar (click + to add). Apply labels via right-click context menu on any file. Click a label in the sidebar to filter the tree.',
      descZh: '标签让您为归档文件打标记以方便筛选。在侧边栏标签区域创建标签（点击 + 添加）。通过右键上下文菜单为文件应用标签。点击侧边栏中的标签以过滤文件树。'
    },
    {
      icon: Layout,
      title: 'Split View',
      titleZh: '分屏视图',
      desc: 'Use the layout icons (□ ⫴ ☰ ⊞) in the top-right of the main panel to switch layouts. In multi-pane mode, click the pane title to pick which chart type each pane shows — allowing simultaneous Profile + Waterfall comparison.',
      descZh: '使用主面板右上角的布局图标（□ ⫴ ☰ ⊞）切换布局。在多窗格模式下，点击窗格标题选择每个窗格显示哪种图表——支持同时对比轮廓图和瀑布图。'
    },
    {
      icon: Settings,
      title: 'Settings',
      titleZh: '设置',
      desc: 'Click the gear icon to open Settings. Change language (EN/ZH), color theme (Dark/Midnight/Nord/Light), chart colorscale, default view, and backend port. All settings persist across sessions.',
      descZh: '点击齿轮图标打开设置。更改语言（中/英）、颜色主题（深色/午夜/Nord/浅色）、图表色阶、默认视图和后端端口。所有设置跨会话持久化。'
    },
    {
      icon: MousePointer2,
      title: 'Plotly Chart Controls',
      titleZh: 'Plotly 图表控件',
      desc: 'All charts share standard Plotly interactions: drag to zoom, Shift+drag to pan, double-click to reset, scroll to zoom on axis, hover for tooltips. The toolbar at top-right of each chart provides download (PNG), zoom, pan, and autoscale buttons.',
      descZh: '所有图表共享标准 Plotly 交互：拖拽缩放，Shift+拖拽平移，双击重置，滚轮在轴上缩放，悬停显示工具提示。每个图表右上角的工具栏提供下载（PNG）、缩放、平移和自动缩放按钮。'
    }
  ]

  return (
    <div className="space-y-4">
      {items.map(item => {
        const Icon = item.icon
        return (
          <div key={item.title} className="flex gap-3 rounded-xl border border-border bg-surface-0/50 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">
                {lang === 'zh' ? item.titleZh : item.title}
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                {lang === 'zh' ? item.descZh : item.desc}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
