import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { ProcessingRecipe, ToaRequest } from '../../../../shared/processing'
import { cloneProcessingRecipe } from '../../../../shared/processing'

interface UseBatchRunnerOptions {
  currentRecipe: ProcessingRecipe
  selectedRecipeId: string | null
  workspaceRecipes: Array<{ id: string; recipe: ProcessingRecipe }>
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

export function useBatchRunner({ currentRecipe, selectedRecipeId, workspaceRecipes }: UseBatchRunnerOptions) {
  const [batchLog, setBatchLog] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)

  const runBatch = useCallback(async () => {
    const files = await window.electron.openFile('archive')
    if (files.length === 0) return

    const activeRecipe =
      workspaceRecipes.find((recipe) => recipe.id === selectedRecipeId)?.recipe ?? currentRecipe

    setBatchRunning(true)
    setBatchLog('Starting batch run...')

    const logLines: string[] = []

    for (const file of files) {
      let sessionId: string | null = null
      try {
        const session = await api.createSession(file)
        sessionId = session.id
        await api.updateSessionRecipe(session.id, cloneProcessingRecipe(activeRecipe))

        const archiveOutputPath = buildArchiveOutputPath(file, activeRecipe)
        await api.exportSessionArchive(session.id, archiveOutputPath)

        let toaOutputPath: string | null = null
        if (activeRecipe.output.exportToa && activeRecipe.toa) {
          toaOutputPath = buildToaOutputPath(file, activeRecipe)
          await api.runSessionToa(session.id, {
            ...activeRecipe.toa,
            format: activeRecipe.output.toaFormat,
            outputPath: toaOutputPath
          } as ToaRequest)
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
  }, [currentRecipe, selectedRecipeId, workspaceRecipes])

  const clearLog = useCallback(() => {
    setBatchLog('')
  }, [])

  return { batchLog, batchRunning, runBatch, clearLog }
}
