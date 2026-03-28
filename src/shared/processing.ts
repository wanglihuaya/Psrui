import type { BackendRuntime } from './backend'

export type ToaAlgorithm = 'PGS' | 'GIS' | 'PIS' | 'SIS' | 'ZPS'
export type ToaFormat = 'tempo2' | 'parkes'
export type CalibrationModel = 'SingleAxis' | 'Polar' | 'Reception'

export interface ZapConfig {
  channels: number[]
}

export interface PamConfig {
  dedisperse: boolean
  tscrunchFactor: number
  fscrunchFactor: number
  bscrunchFactor: number
  phaseRotateTurns: number
}

export interface CalibrationConfig {
  enabled: boolean
  searchPath: string | null
  databasePath: string | null
  solutionPath: string | null
  model: CalibrationModel
  polOnly: boolean
}

export interface ToaRequest {
  templatePath: string
  algorithm: ToaAlgorithm
  format: ToaFormat
  timeScrunch: boolean
  frequencyScrunch: boolean
  outputPath?: string | null
}

export interface ToaResidual {
  phase: number[]
  observed: number[]
  template: number[]
  difference: number[]
}

export interface ToaRow {
  line: string
  shiftTurns: number
  errorTurns: number
  frequencyMHz: number | null
  subint: number | null
  chan: number | null
}

export interface ToaResult {
  format: ToaFormat
  rawOutput: string
  rows: ToaRow[]
  residual: ToaResidual | null
  command: string[]
  outputPath: string | null
}

export interface ProcessingOutputConfig {
  archiveExtension: string
  exportToa: boolean
  toaFormat: ToaFormat
  outputDirectory: string | null
}

export interface ProcessingRecipe {
  zap: ZapConfig
  pam: PamConfig
  calibration: CalibrationConfig
  toa: ToaRequest | null
  output: ProcessingOutputConfig
}

export interface BatchRecipe {
  id: string
  name: string
  workspacePath: string | null
  recipe: ProcessingRecipe
  createdAt: string
  updatedAt: string
}

export interface ProcessingCapabilities {
  runtime: BackendRuntime
  provider: string
  cli: {
    paz: boolean
    pam: boolean
    pat: boolean
    pac: boolean
    tempo2: boolean
  }
  features: {
    sessions: boolean
    zapping: boolean
    pam: boolean
    toa: boolean
    calibration: boolean
    batch: boolean
  }
  messages: string[]
}

export interface ProcessingSession {
  id: string
  path: string
  previewPath: string | null
  recipe: ProcessingRecipe
}

export const DEFAULT_ZAP_CONFIG: ZapConfig = {
  channels: []
}

export const DEFAULT_PAM_CONFIG: PamConfig = {
  dedisperse: true,
  tscrunchFactor: 1,
  fscrunchFactor: 1,
  bscrunchFactor: 1,
  phaseRotateTurns: 0
}

export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  enabled: false,
  searchPath: null,
  databasePath: null,
  solutionPath: null,
  model: 'SingleAxis',
  polOnly: false
}

export const DEFAULT_OUTPUT_CONFIG: ProcessingOutputConfig = {
  archiveExtension: 'processed',
  exportToa: false,
  toaFormat: 'tempo2',
  outputDirectory: null
}

export const DEFAULT_PROCESSING_RECIPE: ProcessingRecipe = {
  zap: DEFAULT_ZAP_CONFIG,
  pam: DEFAULT_PAM_CONFIG,
  calibration: DEFAULT_CALIBRATION_CONFIG,
  toa: null,
  output: DEFAULT_OUTPUT_CONFIG
}

/**
 * Union type for recipe updates - supports direct value or updater function
 */
export type RecipeUpdate = ProcessingRecipe | ((prev: ProcessingRecipe) => ProcessingRecipe)

/**
 * Deep clone a ProcessingRecipe using native structuredClone for better performance
 */
export function cloneProcessingRecipe(recipe: ProcessingRecipe): ProcessingRecipe {
  return structuredClone(recipe)
}
