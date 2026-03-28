import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import * as Tabs from '@radix-ui/react-tabs'
import { clsx } from 'clsx'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  FolderOpen,
  ListChecks,
  Loader2,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
  Zap
} from 'lucide-react'
import { api } from '@/lib/api'
import { batchRecipesAtom, workspacePathAtom } from '@/lib/settings'
import {
  currentSessionIdAtom,
  metadataAtom,
  processingCapabilitiesAtom,
  processingInspectorOpenAtom,
  processingRecipeAtom,
  toaResultAtom
} from '@/lib/store'
import { PlotlyWrapper } from './charts/PlotlyWrapper'
import type { ProcessingRecipe, ToaRequest, BatchRecipe, RecipeUpdate } from '../../../shared/processing'
import { cloneProcessingRecipe } from '../../../shared/processing'

interface ProcessingInspectorProps {
  currentFile: string | null
  backendReady: boolean
  onApplyProcessingRecipe: (
    update: RecipeUpdate,
    options?: {
      pushHistory?: boolean
      resetToa?: boolean
    }
  ) => Promise<void>
  onRunToa: (request: ToaRequest) => Promise<void>
  onSaveArchive: () => Promise<void>
}

function createDefaultToaRequest(format: ToaRequest['format']): ToaRequest {
  return {
    templatePath: '',
    algorithm: 'PGS',
    format,
    timeScrunch: false,
    frequencyScrunch: false,
    outputPath: null
  }
}

function parsePath(pathname: string): { dir: string; filename: string; stem: string; extension: string } {
  const separatorIndex = Math.max(pathname.lastIndexOf('/'), pathname.lastIndexOf('\\'))
  const dir = separatorIndex >= 0 ? pathname.slice(0, separatorIndex) : ''
  const filename = separatorIndex >= 0 ? pathname.slice(separatorIndex + 1) : pathname
  const extIndex = filename.lastIndexOf('.')
  const stem = extIndex > 0 ? filename.slice(0, extIndex) : filename
  const extension = extIndex > 0 ? filename.slice(extIndex) : ''
  return { dir, filename, stem, extension }
}

function joinPath(dir: string, filename: string): string {
  if (!dir) return filename
  const separator = dir.includes('\\') && !dir.includes('/') ? '\\' : '/'
  if (dir.endsWith('/') || dir.endsWith('\\')) {
    return `${dir}${filename}`
  }
  return `${dir}${separator}${filename}`
}

function buildArchiveOutputPath(inputPath: string, recipe: ProcessingRecipe): string {
  const { dir, stem, extension } = parsePath(inputPath)
  const outputDir = recipe.output.outputDirectory || dir
  const archiveExtension = recipe.output.archiveExtension.trim().replace(/^\.+/, '') || 'processed'
  return joinPath(outputDir, `${stem}.${archiveExtension}${extension || '.ar'}`)
}

function buildToaOutputPath(inputPath: string, recipe: ProcessingRecipe): string {
  const { dir, stem } = parsePath(inputPath)
  const outputDir = recipe.output.outputDirectory || dir
  const extension = recipe.output.toaFormat === 'parkes' ? 'toa.txt' : 'tim'
  return joinPath(outputDir, `${stem}.${extension}`)
}

function RecipeSection({
  title,
  description,
  children,
  action
}: {
  title: string
  description: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-0/70">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">{description}</p>
        </div>
        {action}
      </div>
      <div className="space-y-3 px-4 py-4">{children}</div>
    </section>
  )
}

function FieldGroup({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="space-y-2">
      <div>
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {hint ? <div className="mt-1 text-xs text-text-muted">{hint}</div> : null}
      </div>
      {children}
    </label>
  )
}

function TabTrigger({ value, icon: Icon, label }: { value: string; icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <Tabs.Trigger
      value={value}
      className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-medium text-text-muted transition-colors data-[state=active]:bg-accent/12 data-[state=active]:text-accent"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Tabs.Trigger>
  )
}

export function ProcessingInspector({
  currentFile,
  backendReady,
  onApplyProcessingRecipe,
  onRunToa,
  onSaveArchive
}: ProcessingInspectorProps) {
  const [isOpen, setIsOpen] = useAtom(processingInspectorOpenAtom)
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const capabilities = useAtomValue(processingCapabilitiesAtom)
  const metadata = useAtomValue(metadataAtom)
  const toaResult = useAtomValue(toaResultAtom)
  const workspacePath = useAtomValue(workspacePathAtom)
  const [processingRecipe, setProcessingRecipe] = useAtom(processingRecipeAtom)
  const [batchRecipes, setBatchRecipes] = useAtom(batchRecipesAtom)
  const [activeTab, setActiveTab] = useState('zap')
  const [pamDraft, setPamDraft] = useState(processingRecipe.pam)
  const [toaDraft, setToaDraft] = useState<ToaRequest>(processingRecipe.toa ?? createDefaultToaRequest(processingRecipe.output.toaFormat))
  const [calibrationLog, setCalibrationLog] = useState<string>('')
  const [batchLog, setBatchLog] = useState<string>('')
  const [batchRunning, setBatchRunning] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)

  const workspaceRecipes = useMemo(
    () => batchRecipes.filter((recipe) => recipe.workspacePath === workspacePath),
    [batchRecipes, workspacePath]
  )

  const canPreview = Boolean(
    currentFile &&
    backendReady &&
    currentSessionId &&
    capabilities?.features.sessions
  )

  useEffect(() => {
    setPamDraft(processingRecipe.pam)
  }, [processingRecipe.pam])

  useEffect(() => {
    setToaDraft(processingRecipe.toa ?? createDefaultToaRequest(processingRecipe.output.toaFormat))
  }, [processingRecipe.toa, processingRecipe.output.toaFormat])

  useEffect(() => {
    const samePamDraft =
      pamDraft.dedisperse === processingRecipe.pam.dedisperse &&
      pamDraft.tscrunchFactor === processingRecipe.pam.tscrunchFactor &&
      pamDraft.fscrunchFactor === processingRecipe.pam.fscrunchFactor &&
      pamDraft.bscrunchFactor === processingRecipe.pam.bscrunchFactor &&
      Math.abs(pamDraft.phaseRotateTurns - processingRecipe.pam.phaseRotateTurns) < 1e-9

    if (samePamDraft || !canPreview) {
      return
    }

    const timeout = window.setTimeout(() => {
      void onApplyProcessingRecipe((prev) => ({
        ...cloneProcessingRecipe(prev),
        pam: { ...pamDraft }
      }))
    }, 220)

    return () => window.clearTimeout(timeout)
  }, [pamDraft, processingRecipe.pam, canPreview, onApplyProcessingRecipe])

  if (!isOpen) {
    return null
  }

  const updateToaDraft = (next: ToaRequest) => {
    setToaDraft(next)
    setProcessingRecipe((prev) => ({
      ...cloneProcessingRecipe(prev),
      toa: { ...next },
      output: { ...prev.output, toaFormat: next.format }
    }))
  }

  const updateOutputConfig = (patch: Partial<ProcessingRecipe['output']>) => {
    setProcessingRecipe((prev) => ({
      ...cloneProcessingRecipe(prev),
      output: { ...prev.output, ...patch }
    }))
  }

  const chooseCalibrationPath = async (kind: 'searchPath' | 'databasePath' | 'solutionPath') => {
    const path =
      kind === 'searchPath'
        ? await window.electron.openDirectory()
        : (await window.electron.openFile(kind === 'databasePath' ? 'text' : 'calibration'))[0]

    if (!path) return

    await onApplyProcessingRecipe((prev) => ({
      ...cloneProcessingRecipe(prev),
      calibration: {
        ...prev.calibration,
        enabled: true,
        [kind]: path
      }
    }))
  }

  const handleCalibrationPreview = async () => {
    if (!currentSessionId) return
    try {
      const preview = await api.previewSessionCalibration(currentSessionId)
      const renderedCommand = preview.command.length > 0 ? `$ ${preview.command.join(' ')}` : ''
      setCalibrationLog([renderedCommand, preview.log].filter(Boolean).join('\n\n'))
    } catch (error) {
      setCalibrationLog(error instanceof Error ? error.message : 'Failed to load calibration preview log.')
    }
  }

  const handleSaveRecipe = () => {
    const trimmed = recipeName.trim() || `Recipe ${workspaceRecipes.length + 1}`
    const timestamp = new Date().toISOString()

    if (selectedRecipeId) {
      setBatchRecipes((prev) =>
        prev.map((recipe) =>
          recipe.id === selectedRecipeId
            ? {
                ...recipe,
                name: trimmed,
                workspacePath,
                recipe: cloneProcessingRecipe(processingRecipe),
                updatedAt: timestamp
              }
            : recipe
        )
      )
      return
    }

    const nextRecipe: BatchRecipe = {
      id: globalThis.crypto?.randomUUID?.() ?? `recipe-${Date.now()}`,
      name: trimmed,
      workspacePath,
      recipe: cloneProcessingRecipe(processingRecipe),
      createdAt: timestamp,
      updatedAt: timestamp
    }

    setBatchRecipes((prev) => [...prev, nextRecipe])
    setSelectedRecipeId(nextRecipe.id)
    setRecipeName(nextRecipe.name)
  }

  const handleLoadRecipe = async (recipe: BatchRecipe) => {
    setSelectedRecipeId(recipe.id)
    setRecipeName(recipe.name)
    setBatchLog('')
    await onApplyProcessingRecipe(cloneProcessingRecipe(recipe.recipe))
  }

  const handleDeleteRecipe = (recipeId: string) => {
    setBatchRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId))
    if (selectedRecipeId === recipeId) {
      setSelectedRecipeId(null)
      setRecipeName('')
    }
  }

  const handleRunBatch = async () => {
    const files = await window.electron.openFile('archive')
    if (files.length === 0) return

    const activeRecipe =
      workspaceRecipes.find((recipe) => recipe.id === selectedRecipeId)?.recipe ?? processingRecipe

    setBatchRunning(true)
    setBatchLog('Starting batch run...')

    const logLines: string[] = []

    for (const file of files) {
      let sessionId: string | null = null
      try {
        const session = await api.createSession(file)
        sessionId = session.id
        await api.updateSessionRecipe(session.id, activeRecipe)

        const archiveOutputPath = buildArchiveOutputPath(file, activeRecipe)
        await api.exportSessionArchive(session.id, archiveOutputPath)

        let toaOutputPath: string | null = null
        if (activeRecipe.output.exportToa && activeRecipe.toa) {
          toaOutputPath = buildToaOutputPath(file, activeRecipe)
          await api.runSessionToa(session.id, {
            ...activeRecipe.toa,
            format: activeRecipe.output.toaFormat,
            outputPath: toaOutputPath
          })
        }

        const archiveLabel = parsePath(archiveOutputPath).filename
        const toaLabel = toaOutputPath ? ` + ${parsePath(toaOutputPath).filename}` : ''
        logLines.push(`[ok] ${parsePath(file).filename} -> ${archiveLabel}${toaLabel}`)
      } catch (error) {
        logLines.push(`[error] ${parsePath(file).filename} -> ${error instanceof Error ? error.message : 'Batch run failed'}`)
      } finally {
        if (sessionId) {
          try {
            await api.deleteSession(sessionId)
          } catch {
            // ignore cleanup errors for batch runs
          }
        }
        setBatchLog(logLines.join('\n'))
      }
    }

    setBatchRunning(false)
  }

  const activeCapabilityMessages = capabilities?.messages ?? []

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">Processing</div>
          <div className="mt-1 text-xs text-text-muted">
            Non-destructive session previews powered by PSRCHIVE tools.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-secondary transition-colors hover:border-border-hover hover:bg-surface-3 hover:text-text-primary"
          title="Close processing inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!canPreview ? (
        <div className="space-y-3 px-4 py-4">
          <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            Open an archive with a live backend session to use advanced PSRCHIVE processing.
          </div>
          {activeCapabilityMessages.length > 0 ? (
            <div className="rounded-2xl border border-border bg-surface-0 px-4 py-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                Capability notes
              </div>
              <div className="space-y-2 text-sm text-text-secondary">
                {activeCapabilityMessages.map((message) => (
                  <div key={message} className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span>{message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <Tabs.List className="grid grid-cols-5 gap-1 border-b border-border px-3 py-2">
            <TabTrigger value="zap" icon={Zap} label="Zap" />
            <TabTrigger value="pam" icon={SlidersHorizontal} label="Pam" />
            <TabTrigger value="toa" icon={Clock3} label="TOA" />
            <TabTrigger value="calibration" icon={ShieldCheck} label="Cal" />
            <TabTrigger value="batch" icon={ListChecks} label="Batch" />
          </Tabs.List>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            <Tabs.Content value="zap" className="space-y-4 outline-none">
              <RecipeSection
                title="Interactive channel zapping"
                description="Click a channel in the waterfall to toggle it, or switch the chart toolbar to box select and drag across a channel range."
                action={
                  <button
                    type="button"
                    onClick={() =>
                      void onApplyProcessingRecipe((prev) => ({
                        ...cloneProcessingRecipe(prev),
                        zap: { channels: [] }
                      }))
                    }
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
                      {processingRecipe.zap.channels.length}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Archive channels</div>
                    <div className="mt-2 text-xl font-semibold text-text-primary">
                      {metadata?.nchan ?? 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-1/60 px-3 py-3">
                  {processingRecipe.zap.channels.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {processingRecipe.zap.channels.map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() =>
                            void onApplyProcessingRecipe((prev) => ({
                              ...cloneProcessingRecipe(prev),
                              zap: {
                                channels: prev.zap.channels.filter((value) => value !== channel)
                              }
                            }))
                          }
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
            </Tabs.Content>

            <Tabs.Content value="pam" className="space-y-4 outline-none">
              <RecipeSection
                title="Real-time pam controls"
                description="These controls update the active processing recipe. Preview refresh is debounced to keep interaction responsive."
              >
                <FieldGroup label="Dedisperse">
                  <button
                    type="button"
                    onClick={() => setPamDraft((prev) => ({ ...prev, dedisperse: !prev.dedisperse }))}
                    className={clsx(
                      'flex h-11 items-center justify-between rounded-2xl border px-4 transition-colors',
                      pamDraft.dedisperse
                        ? 'border-accent bg-accent/12 text-accent'
                        : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover'
                    )}
                  >
                    <span className="text-sm font-medium">
                      {pamDraft.dedisperse ? 'Enabled' : 'Disabled'}
                    </span>
                    <div
                      className={clsx(
                        'flex h-6 w-11 items-center rounded-full px-1 transition-colors',
                        pamDraft.dedisperse ? 'bg-accent' : 'bg-surface-3'
                      )}
                    >
                      <div
                        className={clsx(
                          'h-4 w-4 rounded-full bg-white transition-transform',
                          pamDraft.dedisperse ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </div>
                  </button>
                </FieldGroup>

                {([
                  ['tscrunchFactor', 'Time scrunch', 1, 16, 1],
                  ['fscrunchFactor', 'Frequency scrunch', 1, 16, 1],
                  ['bscrunchFactor', 'Bin scrunch', 1, 16, 1]
                ] as const).map(([key, label, min, max, step]) => (
                  <FieldGroup key={key} label={label}>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={pamDraft[key as keyof typeof pamDraft] as number}
                        onChange={(event) =>
                          setPamDraft((prev) => ({
                            ...prev,
                            [key]: Number(event.target.value)
                          }))
                        }
                        className="h-2 flex-1 accent-accent"
                      />
                      <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={pamDraft[key as keyof typeof pamDraft] as number}
                        onChange={(event) =>
                          setPamDraft((prev) => ({
                            ...prev,
                            [key]: Math.max(Number(min), Number(event.target.value) || Number(min))
                          }))
                        }
                        className="w-20 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                      />
                    </div>
                  </FieldGroup>
                ))}

                <FieldGroup label="Phase rotate (turns)" hint="Use fractional turns to align the pulse peak before exporting.">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={-0.5}
                      max={0.5}
                      step={0.005}
                      value={pamDraft.phaseRotateTurns}
                      onChange={(event) =>
                        setPamDraft((prev) => ({
                          ...prev,
                          phaseRotateTurns: Number(event.target.value)
                        }))
                      }
                      className="h-2 flex-1 accent-accent"
                    />
                    <input
                      type="number"
                      min={-0.5}
                      max={0.5}
                      step={0.005}
                      value={pamDraft.phaseRotateTurns}
                      onChange={(event) =>
                        setPamDraft((prev) => ({
                          ...prev,
                          phaseRotateTurns: Number(event.target.value) || 0
                        }))
                      }
                        className="w-20 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    />
                  </div>
                </FieldGroup>
              </RecipeSection>
            </Tabs.Content>

            <Tabs.Content value="toa" className="space-y-4 outline-none">
              <RecipeSection
                title="TOA extraction"
                description="Run pat with a standard template and inspect the aligned profile residual directly in the GUI."
                action={
                  <button
                    type="button"
                    onClick={() => void onRunToa(toaDraft)}
                    disabled={!toaDraft.templatePath}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run TOA
                  </button>
                }
              >
                <FieldGroup label="Template archive" hint="Choose a standard profile/template archive for pat to match against.">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const selected = await window.electron.openFile('archive')
                        if (selected[0]) {
                          updateToaDraft({ ...toaDraft, templatePath: selected[0] })
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Choose template
                    </button>
                    <input
                      value={toaDraft.templatePath}
                      onChange={(event) => updateToaDraft({ ...toaDraft, templatePath: event.target.value })}
                      placeholder="/path/to/template.ar"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    />
                  </div>
                </FieldGroup>

                <div className="grid gap-3 md:grid-cols-2">
                  <FieldGroup label="Algorithm">
                    <select
                      value={toaDraft.algorithm}
                      onChange={(event) =>
                        updateToaDraft({ ...toaDraft, algorithm: event.target.value as ToaRequest['algorithm'] })
                      }
                      className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    >
                      {['PGS', 'GIS', 'PIS', 'SIS', 'ZPS'].map((algorithm) => (
                        <option key={algorithm} value={algorithm}>
                          {algorithm}
                        </option>
                      ))}
                    </select>
                  </FieldGroup>

                  <FieldGroup label="Output format">
                    <select
                      value={toaDraft.format}
                      onChange={(event) =>
                        updateToaDraft({ ...toaDraft, format: event.target.value as ToaRequest['format'] })
                      }
                      className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    >
                      <option value="tempo2">tempo2</option>
                      <option value="parkes">parkes</option>
                    </select>
                  </FieldGroup>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateToaDraft({ ...toaDraft, timeScrunch: !toaDraft.timeScrunch })}
                    className={clsx(
                      'rounded-2xl border px-4 py-3 text-left transition-colors',
                      toaDraft.timeScrunch
                        ? 'border-accent bg-accent/12 text-accent'
                        : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover'
                    )}
                  >
                    <div className="text-sm font-medium">Time scrunch before pat</div>
                    <div className="mt-1 text-xs text-text-muted">Apply `-T` to integrate sub-integrations before TOA extraction.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateToaDraft({ ...toaDraft, frequencyScrunch: !toaDraft.frequencyScrunch })}
                    className={clsx(
                      'rounded-2xl border px-4 py-3 text-left transition-colors',
                      toaDraft.frequencyScrunch
                        ? 'border-accent bg-accent/12 text-accent'
                        : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover'
                    )}
                  >
                    <div className="text-sm font-medium">Frequency scrunch before pat</div>
                    <div className="mt-1 text-xs text-text-muted">Apply `-F` to integrate channels before TOA extraction.</div>
                  </button>
                </div>

                <FieldGroup label="Optional export path">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!currentFile) return
                        const defaultName = parsePath(buildToaOutputPath(currentFile, {
                          ...processingRecipe,
                          toa: toaDraft,
                          output: { ...processingRecipe.output, toaFormat: toaDraft.format }
                        })).filename
                        const target = await window.electron.saveFile(defaultName, 'text')
                        if (target) {
                          updateToaDraft({ ...toaDraft, outputPath: target })
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                    >
                      <Download className="h-4 w-4" />
                      Choose file
                    </button>
                    <input
                      value={toaDraft.outputPath ?? ''}
                      onChange={(event) => updateToaDraft({ ...toaDraft, outputPath: event.target.value || null })}
                      placeholder="Optional .tim / .txt output path"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    />
                  </div>
                </FieldGroup>
              </RecipeSection>

              {toaResult ? (
                <>
                  <RecipeSection
                    title="TOA result"
                    description="Raw output from pat plus the parsed row used for the quick-look residual plot."
                  >
                    <div className="rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Generated {toaResult.rows.length} TOA row{toaResult.rows.length === 1 ? '' : 's'} using {toaResult.command.join(' ')}.</span>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-surface-2 text-text-secondary">
                          <tr>
                            <th className="px-3 py-2 font-medium">Subint</th>
                            <th className="px-3 py-2 font-medium">Chan</th>
                            <th className="px-3 py-2 font-medium">Shift (turns)</th>
                            <th className="px-3 py-2 font-medium">Error</th>
                            <th className="px-3 py-2 font-medium">MHz</th>
                          </tr>
                        </thead>
                        <tbody>
                          {toaResult.rows.map((row, index) => (
                            <tr key={`${row.subint ?? 'na'}-${row.chan ?? 'na'}-${index}`} className="border-t border-border/70 bg-surface-1/60">
                              <td className="px-3 py-2 text-text-primary">{row.subint ?? 'N/A'}</td>
                              <td className="px-3 py-2 text-text-primary">{row.chan ?? 'N/A'}</td>
                              <td className="px-3 py-2 text-text-primary">{row.shiftTurns.toExponential(4)}</td>
                              <td className="px-3 py-2 text-text-primary">{row.errorTurns.toExponential(4)}</td>
                              <td className="px-3 py-2 text-text-primary">{row.frequencyMHz?.toFixed(3) ?? 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <pre className="overflow-x-auto rounded-2xl border border-border bg-surface-1 px-3 py-3 text-xs leading-relaxed text-text-secondary">
                      {toaResult.rawOutput}
                    </pre>
                  </RecipeSection>

                  {toaResult.residual ? (
                    <RecipeSection
                      title="Visual residual"
                      description="Observed profile, aligned template, and the difference trace generated from the current TOA solution."
                    >
                      <div className="h-[260px] overflow-hidden rounded-2xl border border-border bg-surface-1/40 p-2">
                        <PlotlyWrapper
                          data={[
                            {
                              x: toaResult.residual.phase,
                              y: toaResult.residual.observed,
                              type: 'scatter',
                              mode: 'lines',
                              name: 'Observed',
                              line: { color: '#7dd3fc', width: 1.6 }
                            },
                            {
                              x: toaResult.residual.phase,
                              y: toaResult.residual.template,
                              type: 'scatter',
                              mode: 'lines',
                              name: 'Aligned template',
                              line: { color: '#fbbf24', width: 1.4 }
                            },
                            {
                              x: toaResult.residual.phase,
                              y: toaResult.residual.difference,
                              type: 'scatter',
                              mode: 'lines',
                              name: 'Difference',
                              line: { color: '#f472b6', width: 1.2 }
                            }
                          ]}
                          layout={{
                            title: { text: 'Template residual', font: { size: 13, color: '#e8ecf4' } },
                            xaxis: { title: { text: 'Phase' }, range: [0, 1] },
                            yaxis: { title: { text: 'Intensity' } },
                            legend: { orientation: 'h', y: 1.08, x: 0 }
                          }}
                        />
                      </div>
                    </RecipeSection>
                  ) : null}
                </>
              ) : null}
            </Tabs.Content>

            <Tabs.Content value="calibration" className="space-y-4 outline-none">
              <RecipeSection
                title="Polarization calibration preview"
                description="Point the session at an existing calibration database, directory, or solution file. Preview stays non-destructive until export."
                action={
                  <button
                    type="button"
                    onClick={() =>
                      void onApplyProcessingRecipe((prev) => ({
                        ...cloneProcessingRecipe(prev),
                        calibration: {
                          ...prev.calibration,
                          enabled: !prev.calibration.enabled
                        }
                      }))
                    }
                    className={clsx(
                      'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                      processingRecipe.calibration.enabled
                        ? 'border-accent bg-accent/12 text-accent'
                        : 'border-border bg-surface-2 text-text-primary hover:border-border-hover hover:bg-surface-3'
                    )}
                  >
                    {processingRecipe.calibration.enabled ? 'Calibration enabled' : 'Enable calibration'}
                  </button>
                }
              >
                <div className="grid gap-3">
                  <FieldGroup label="Calibration search path">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void chooseCalibrationPath('searchPath')}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Choose folder
                      </button>
                      <input
                        value={processingRecipe.calibration.searchPath ?? ''}
                        onChange={(event) =>
                          void onApplyProcessingRecipe((prev) => ({
                            ...cloneProcessingRecipe(prev),
                            calibration: {
                              ...prev.calibration,
                              searchPath: event.target.value || null,
                              enabled: true
                            }
                          }))
                        }
                        placeholder="/path/to/calibrators"
                        className="min-w-0 flex-1 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                      />
                    </div>
                  </FieldGroup>

                  <FieldGroup label="database.txt">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void chooseCalibrationPath('databasePath')}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Choose file
                      </button>
                      <input
                        value={processingRecipe.calibration.databasePath ?? ''}
                        onChange={(event) =>
                          void onApplyProcessingRecipe((prev) => ({
                            ...cloneProcessingRecipe(prev),
                            calibration: {
                              ...prev.calibration,
                              databasePath: event.target.value || null,
                              enabled: true
                            }
                          }))
                        }
                        placeholder="/path/to/database.txt"
                        className="min-w-0 flex-1 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                      />
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Solution file">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void chooseCalibrationPath('solutionPath')}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Choose file
                      </button>
                      <input
                        value={processingRecipe.calibration.solutionPath ?? ''}
                        onChange={(event) =>
                          void onApplyProcessingRecipe((prev) => ({
                            ...cloneProcessingRecipe(prev),
                            calibration: {
                              ...prev.calibration,
                              solutionPath: event.target.value || null,
                              enabled: true
                            }
                          }))
                        }
                        placeholder="/path/to/solution.cal"
                        className="min-w-0 flex-1 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                      />
                    </div>
                  </FieldGroup>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <FieldGroup label="Calibration model">
                    <select
                      value={processingRecipe.calibration.model}
                      onChange={(event) =>
                        void onApplyProcessingRecipe((prev) => ({
                          ...cloneProcessingRecipe(prev),
                          calibration: {
                            ...prev.calibration,
                            enabled: true,
                            model: event.target.value as ProcessingRecipe['calibration']['model']
                          }
                        }))
                      }
                      className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    >
                      <option value="SingleAxis">SingleAxis</option>
                      <option value="Polar">Polar</option>
                      <option value="Reception">Reception</option>
                    </select>
                  </FieldGroup>

                  <FieldGroup label="Mode">
                    <button
                      type="button"
                      onClick={() =>
                        void onApplyProcessingRecipe((prev) => ({
                          ...cloneProcessingRecipe(prev),
                          calibration: {
                            ...prev.calibration,
                            enabled: true,
                            polOnly: !prev.calibration.polOnly
                          }
                        }))
                      }
                      className={clsx(
                        'rounded-2xl border px-4 py-3 text-left transition-colors',
                        processingRecipe.calibration.polOnly
                          ? 'border-accent bg-accent/12 text-accent'
                          : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover'
                      )}
                    >
                      <div className="text-sm font-medium">Pol-only</div>
                      <div className="mt-1 text-xs text-text-muted">
                        Toggle `pac -P` when only the polarization response should be applied.
                      </div>
                    </button>
                  </FieldGroup>
                </div>
              </RecipeSection>

              <RecipeSection
                title="Calibration preview log"
                description="Inspect the exact command and tool output for the current calibration preview."
                action={
                  <button
                    type="button"
                    onClick={() => void handleCalibrationPreview()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                  </button>
                }
              >
                <pre className="overflow-x-auto rounded-2xl border border-border bg-surface-1 px-3 py-3 text-xs leading-relaxed text-text-secondary">
                  {calibrationLog || 'Enable calibration and refresh to inspect the pac preview command.'}
                </pre>
              </RecipeSection>
            </Tabs.Content>

            <Tabs.Content value="batch" className="space-y-4 outline-none">
              <RecipeSection
                title="Export defaults"
                description="Batch runs use these defaults for archive output naming and optional TOA export."
                action={
                  <button
                    type="button"
                    onClick={() => void onSaveArchive()}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export current archive
                  </button>
                }
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <FieldGroup label="Archive extension" hint="Used when exporting the current session or running batch recipes.">
                    <input
                      value={processingRecipe.output.archiveExtension}
                      onChange={(event) =>
                        updateOutputConfig({
                          archiveExtension: event.target.value.trim().replace(/^\.+/, '') || 'processed'
                        })
                      }
                      className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    />
                  </FieldGroup>

                  <FieldGroup label="TOA export format">
                    <select
                      value={processingRecipe.output.toaFormat}
                      onChange={(event) =>
                        updateOutputConfig({
                          toaFormat: event.target.value as ProcessingRecipe['output']['toaFormat']
                        })
                      }
                      className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    >
                      <option value="tempo2">tempo2</option>
                      <option value="parkes">parkes</option>
                    </select>
                  </FieldGroup>
                </div>

                <FieldGroup label="Batch output directory" hint="Leave empty to export next to each source archive.">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const directory = await window.electron.openDirectory()
                        if (directory) {
                          updateOutputConfig({ outputDirectory: directory })
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Choose folder
                    </button>
                    <input
                      value={processingRecipe.output.outputDirectory ?? ''}
                      onChange={(event) => updateOutputConfig({ outputDirectory: event.target.value || null })}
                      placeholder="Use source archive directory"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                    />
                  </div>
                </FieldGroup>

                <button
                  type="button"
                  onClick={() => updateOutputConfig({ exportToa: !processingRecipe.output.exportToa })}
                  className={clsx(
                    'rounded-2xl border px-4 py-3 text-left transition-colors',
                    processingRecipe.output.exportToa
                      ? 'border-accent bg-accent/12 text-accent'
                      : 'border-border bg-surface-1 text-text-secondary hover:border-border-hover'
                  )}
                >
                  <div className="text-sm font-medium">Export TOA alongside batch archives</div>
                  <div className="mt-1 text-xs text-text-muted">
                    When enabled, batch runs also emit `.tim` or Parkes-style text using the current TOA tab settings.
                  </div>
                </button>
              </RecipeSection>

              <RecipeSection
                title="Saved recipes"
                description="Persist a recipe per workspace, then load or batch-run it on selected archives."
                action={
                  <button
                    type="button"
                    onClick={handleSaveRecipe}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {selectedRecipeId ? 'Update recipe' : 'Save recipe'}
                  </button>
                }
              >
                <FieldGroup label="Recipe name">
                  <input
                    value={recipeName}
                    onChange={(event) => setRecipeName(event.target.value)}
                    placeholder="Nightly zap + TOA"
                    className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary outline-hidden"
                  />
                </FieldGroup>

                <div className="space-y-2">
                  {workspaceRecipes.length > 0 ? (
                    workspaceRecipes.map((recipe) => (
                      <div
                        key={recipe.id}
                        className={clsx(
                          'rounded-2xl border px-3 py-3 transition-colors',
                          recipe.id === selectedRecipeId
                            ? 'border-accent/50 bg-accent/10'
                            : 'border-border bg-surface-1/60'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-text-primary">{recipe.name}</div>
                            <div className="mt-1 text-xs text-text-muted">
                              Updated {new Date(recipe.updatedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void handleLoadRecipe(recipe)}
                              className="rounded-xl border border-border bg-surface-2 px-2.5 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                            >
                              Load
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecipeId(recipe.id)
                                setRecipeName(recipe.name)
                              }}
                              className="rounded-xl border border-border bg-surface-2 px-2.5 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecipe(recipe.id)}
                              className="rounded-xl border border-danger/40 bg-danger/10 px-2.5 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/15"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-text-muted">
                      No recipes saved for this workspace yet.
                    </div>
                  )}
                </div>
              </RecipeSection>

              <RecipeSection
                title="Run batch"
                description="Select one or more archives, apply the active recipe sequentially, and export new files without overwriting the sources."
                action={
                  <button
                    type="button"
                    onClick={() => void handleRunBatch()}
                    disabled={batchRunning}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:border-border-hover hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {batchRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    {batchRunning ? 'Running...' : 'Select files and run'}
                  </button>
                }
              >
                <div className="rounded-2xl border border-border bg-surface-1 px-3 py-3">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-text-muted">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Batch log
                  </div>
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-text-secondary">
                    {batchLog || 'Pick files to start a batch run. The selected saved recipe is used when present; otherwise the current live recipe is exported.'}
                  </pre>
                </div>
              </RecipeSection>
            </Tabs.Content>
          </div>
        </Tabs.Root>
      )}
    </aside>
  )
}
