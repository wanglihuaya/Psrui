import { atom } from 'jotai'
import type { ArchiveMetadata, ProfileData, WaterfallData, TimePhaseData, BandpassData, FileTreeNode } from './api'

export const currentFileAtom = atom<string | null>(null)
export const metadataAtom = atom<ArchiveMetadata | null>(null)

export const profileDataAtom = atom<ProfileData | null>(null)
export const waterfallDataAtom = atom<WaterfallData | null>(null)
export const timePhaseDataAtom = atom<TimePhaseData | null>(null)
export const bandpassDataAtom = atom<BandpassData | null>(null)

// active main tab — psrcat removed from here, it lives in sidebar
export type ViewTab = 'profile' | 'waterfall' | 'time-phase' | 'bandpass'
export const activeTabAtom = atom<ViewTab>('profile')

export const loadingAtom = atom(false)
export const errorAtom = atom<string | null>(null)
export const backendReadyAtom = atom(false)
export const openFilesAtom = atom<string[]>([])
export const helpOpenAtom = atom(false)

// PSRCAT sidebar panel open
export const psrcatOpenAtom = atom(false)

// file tree from backend
export const fileTreeAtom = atom<FileTreeNode | null>(null)
export const fileTreeLoadingAtom = atom(false)

// split view layout
export type SplitLayout = 'single' | 'horizontal' | 'vertical' | 'grid'
export const splitLayoutAtom = atom<SplitLayout>('single')

// which panels are in each split slot [slot0, slot1, slot2, slot3]
export type SplitSlot = ViewTab
export const splitSlotsAtom = atom<SplitSlot[]>(['profile', 'waterfall', 'time-phase', 'bandpass'])
