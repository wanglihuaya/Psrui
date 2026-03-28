import { useState, useMemo, useCallback } from 'react'
import { useAtom, useAtomValue } from 'jotai'
import { batchRecipesAtom, workspacePathAtom } from '../../../lib/settings'
import type { ProcessingRecipe, BatchRecipe } from '../../../../shared/processing'
import { cloneProcessingRecipe } from '../../../../shared/processing'

interface UseRecipeManagerOptions {
  currentRecipe: ProcessingRecipe
  onLoadRecipe: (recipe: ProcessingRecipe) => void
}

export function useRecipeManager({ currentRecipe, onLoadRecipe }: UseRecipeManagerOptions) {
  const [batchRecipes, setBatchRecipes] = useAtom(batchRecipesAtom)
  const workspacePath = useAtomValue(workspacePathAtom)
  const [recipeName, setRecipeName] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)

  const workspaceRecipes = useMemo(
    () => batchRecipes.filter((recipe) => recipe.workspacePath === workspacePath),
    [batchRecipes, workspacePath]
  )

  const saveRecipe = useCallback(() => {
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
                recipe: cloneProcessingRecipe(currentRecipe),
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
      recipe: cloneProcessingRecipe(currentRecipe),
      createdAt: timestamp,
      updatedAt: timestamp
    }

    setBatchRecipes((prev) => [...prev, nextRecipe])
    setSelectedRecipeId(nextRecipe.id)
    setRecipeName(nextRecipe.name)
  }, [recipeName, selectedRecipeId, workspacePath, currentRecipe, workspaceRecipes.length, setBatchRecipes])

  const loadRecipe = useCallback(
    async (recipe: BatchRecipe) => {
      setSelectedRecipeId(recipe.id)
      setRecipeName(recipe.name)
      await onLoadRecipe(cloneProcessingRecipe(recipe.recipe))
    },
    [onLoadRecipe]
  )

  const deleteRecipe = useCallback(
    (recipeId: string) => {
      setBatchRecipes((prev) => prev.filter((recipe) => recipe.id !== recipeId))
      if (selectedRecipeId === recipeId) {
        setSelectedRecipeId(null)
        setRecipeName('')
      }
    },
    [selectedRecipeId, setBatchRecipes]
  )

  const selectRecipe = useCallback((recipe: BatchRecipe) => {
    setSelectedRecipeId(recipe.id)
    setRecipeName(recipe.name)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedRecipeId(null)
    setRecipeName('')
  }, [])

  return {
    workspaceRecipes,
    recipeName,
    setRecipeName,
    selectedRecipeId,
    saveRecipe,
    loadRecipe,
    deleteRecipe,
    selectRecipe,
    clearSelection
  }
}
