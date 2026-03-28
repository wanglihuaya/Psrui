import { useEffect, useState } from 'react'
import { PAM_UPDATE_DEBOUNCE_MS } from '@/shared/constants'
import type { PamConfig, ProcessingRecipe } from '@/shared/processing'
import { cloneProcessingRecipe } from '@/shared/processing'

interface UsePamDraftOptions {
  pam: PamConfig
  canPreview: boolean
  onApply: (updater: (prev: ProcessingRecipe) => ProcessingRecipe) => void
}

export function usePamDraft({ pam, canPreview, onApply }: UsePamDraftOptions) {
  const [draft, setDraft] = useState<PamConfig>(pam)

  // Sync draft when external pam changes
  useEffect(() => {
    setDraft(pam)
  }, [pam])

  // Debounced apply
  useEffect(() => {
    const samePamDraft =
      draft.dedisperse === pam.dedisperse &&
      draft.tscrunchFactor === pam.tscrunchFactor &&
      draft.fscrunchFactor === pam.fscrunchFactor &&
      draft.bscrunchFactor === pam.bscrunchFactor &&
      Math.abs(draft.phaseRotateTurns - pam.phaseRotateTurns) < 1e-9

    if (samePamDraft || !canPreview) {
      return
    }

    const timeout = window.setTimeout(() => {
      onApply((prev) => ({
        ...cloneProcessingRecipe(prev),
        pam: { ...draft }
      }))
    }, PAM_UPDATE_DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [draft, pam, canPreview, onApply])

  const updateDraft = (patch: Partial<PamConfig>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  return { draft, updateDraft }
}
