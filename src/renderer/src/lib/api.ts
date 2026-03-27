import type {
  ProcessingCapabilities,
  ProcessingRecipe,
  ProcessingSession,
  ToaRequest,
  ToaResult
} from '../../../shared/processing'

const BASE_URL = 'http://127.0.0.1:8787'

export interface ArchiveMetadata {
  filename: string
  source: string
  telescope: string
  instrument: string
  freq_lo: number
  freq_hi: number
  centre_freq: number
  bandwidth: number
  nchan: number
  nsubint: number
  nbin: number
  npol: number
  period: number
  dm: number
  duration: number
}

export interface ProfileData {
  phase: number[]
  intensity: number[]
  stokes_q?: number[]
  stokes_u?: number[]
  stokes_v?: number[]
}

export interface WaterfallData {
  phase: number[]
  channels: number[]
  intensities: number[][]
}

export interface TimePhaseData {
  phase: number[]
  subints: number[]
  intensities: number[][]
}

export interface BandpassData {
  channels: number[]
  intensities: number[]
}

export interface PsrcatPulsar {
  PSRJ: string
  PSRB?: string
  P0: number
  P1: number
  DM?: number
  class: 'Normal' | 'MSP' | 'Binary' | 'Magnetar' | string
  RAJ_deg?: number
  DECJ_deg?: number
}

export interface PsrcatStats {
  total: number
  classes: Record<string, number>
}

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children: FileTreeNode[]
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

async function apiSend<T>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `API ${path}: ${res.status} ${res.statusText}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json()
}

export const api = {
  health: () => apiFetch<{ status: string }>('/api/health'),
  getCapabilities: () => apiFetch<ProcessingCapabilities>('/api/capabilities'),

  listFiles: (directory?: string) =>
    apiFetch<{ files: string[] }>(`/api/files${directory ? `?dir=${encodeURIComponent(directory)}` : ''}`),

  getFileTree: (directory?: string) =>
    apiFetch<FileTreeNode>(`/api/files/tree${directory ? `?dir=${encodeURIComponent(directory)}` : ''}`),

  loadArchive: (filepath: string) =>
    apiFetch<ArchiveMetadata>(`/api/archive?path=${encodeURIComponent(filepath)}`),

  getProfile: (filepath: string, subint?: number, chan?: number) => {
    const params = new URLSearchParams({ path: filepath })
    if (subint !== undefined) params.set('subint', String(subint))
    if (chan !== undefined) params.set('chan', String(chan))
    return apiFetch<ProfileData>(`/api/archive/profile?${params}`)
  },

  getWaterfall: (filepath: string, subint?: number) => {
    const params = new URLSearchParams({ path: filepath })
    if (subint !== undefined) params.set('subint', String(subint))
    return apiFetch<WaterfallData>(`/api/archive/waterfall?${params}`)
  },

  getTimePhase: (filepath: string, chan?: number) => {
    const params = new URLSearchParams({ path: filepath })
    if (chan !== undefined) params.set('chan', String(chan))
    return apiFetch<TimePhaseData>(`/api/archive/time-phase?${params}`)
  },

  getBandpass: (filepath: string) =>
    apiFetch<BandpassData>(`/api/archive/bandpass?path=${encodeURIComponent(filepath)}`),

  createSession: (filepath: string) =>
    apiSend<ProcessingSession>('/api/sessions', 'POST', { path: filepath }),

  updateSessionRecipe: (sessionId: string, recipe: ProcessingRecipe) =>
    apiSend<ProcessingSession>(`/api/sessions/${encodeURIComponent(sessionId)}/recipe`, 'PATCH', { recipe }),

  deleteSession: (sessionId: string) =>
    apiSend<{ ok: boolean }>(`/api/sessions/${encodeURIComponent(sessionId)}`, 'DELETE'),

  getSessionMetadata: (sessionId: string) =>
    apiFetch<ArchiveMetadata>(`/api/sessions/${encodeURIComponent(sessionId)}/preview/metadata`),

  getSessionProfile: (sessionId: string, subint?: number, chan?: number) => {
    const params = new URLSearchParams()
    if (subint !== undefined) params.set('subint', String(subint))
    if (chan !== undefined) params.set('chan', String(chan))
    const query = params.toString()
    return apiFetch<ProfileData>(`/api/sessions/${encodeURIComponent(sessionId)}/preview/profile${query ? `?${query}` : ''}`)
  },

  getSessionWaterfall: (sessionId: string, subint?: number) => {
    const params = new URLSearchParams()
    if (subint !== undefined) params.set('subint', String(subint))
    const query = params.toString()
    return apiFetch<WaterfallData>(`/api/sessions/${encodeURIComponent(sessionId)}/preview/waterfall${query ? `?${query}` : ''}`)
  },

  getSessionTimePhase: (sessionId: string, chan?: number) => {
    const params = new URLSearchParams()
    if (chan !== undefined) params.set('chan', String(chan))
    const query = params.toString()
    return apiFetch<TimePhaseData>(`/api/sessions/${encodeURIComponent(sessionId)}/preview/time-phase${query ? `?${query}` : ''}`)
  },

  getSessionBandpass: (sessionId: string) =>
    apiFetch<BandpassData>(`/api/sessions/${encodeURIComponent(sessionId)}/preview/bandpass`),

  exportSessionArchive: (sessionId: string, outputPath: string) =>
    apiSend<{ outputPath: string }>(`/api/sessions/${encodeURIComponent(sessionId)}/export`, 'POST', { outputPath }),

  runSessionToa: (sessionId: string, request: ToaRequest) =>
    apiSend<ToaResult>(`/api/sessions/${encodeURIComponent(sessionId)}/toa`, 'POST', request),

  previewSessionCalibration: (sessionId: string) =>
    apiSend<{ command: string[]; commands: string[][]; log: string; previewPath: string | null }>(
      `/api/sessions/${encodeURIComponent(sessionId)}/calibration/preview`,
      'POST'
    ),

  getPsrcatPulsars: () => apiFetch<PsrcatPulsar[]>('/api/psrcat/pulsars'),
  getPsrcatStats: () => apiFetch<PsrcatStats>('/api/psrcat/stats')
}
