import { useAtom, useAtomValue } from 'jotai'
import { psrcatOpenAtom, metadataAtom } from '@/lib/store'
import PsrcatView from './charts/PsrcatView'
import { useEffect } from 'react'

export function PsrcatPanel() {
  const [open, setOpen] = useAtom(psrcatOpenAtom)
  const metadata = useAtomValue(metadataAtom)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, setOpen])

  if (!open) return null

  const initialSource = metadata?.source ?? ''

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-surface-0">
      <div className="flex-1 overflow-hidden">
        <PsrcatView initialHighlight={initialSource} />
      </div>
    </div>
  )
}
