import { useAtomValue } from 'jotai'
import { backendReadyAtom, currentFileAtom, metadataAtom, loadingAtom } from '@/lib/store'

export function StatusBar() {
  const backendReady = useAtomValue(backendReadyAtom)
  const currentFile = useAtomValue(currentFileAtom)
  const metadata = useAtomValue(metadataAtom)
  const loading = useAtomValue(loadingAtom)

  return (
    <div className="flex items-center justify-between h-7 px-4 bg-surface-1 border-t border-border text-xs text-text-muted shrink-0">
      <div className="flex items-center gap-4">
        <span className={backendReady ? 'text-success' : 'text-danger'}>
          {backendReady ? '● Backend OK' : '○ Backend offline'}
        </span>
        {loading && <span className="text-warning">Loading...</span>}
      </div>

      <div className="flex items-center gap-4">
        {metadata && (
          <>
            <span>{metadata.source}</span>
            <span>{metadata.telescope}</span>
            <span>{metadata.nchan}ch × {metadata.nsubint}sub × {metadata.nbin}bin</span>
          </>
        )}
        {currentFile && (
          <span className="text-text-muted truncate max-w-80">{currentFile}</span>
        )}
      </div>
    </div>
  )
}
