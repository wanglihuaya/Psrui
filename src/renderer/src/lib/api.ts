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

export const api = {
  health: () => apiFetch<{ status: string }>('/api/health'),

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

  getPsrcatPulsars: () => apiFetch<PsrcatPulsar[]>('/api/psrcat/pulsars'),
  getPsrcatStats: () => apiFetch<PsrcatStats>('/api/psrcat/stats')
}
