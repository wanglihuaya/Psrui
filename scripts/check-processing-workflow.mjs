import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const files = {
  app: resolve('src/renderer/src/App.tsx'),
  inspector: resolve('src/renderer/src/components/ProcessingInspector.tsx'),
  api: resolve('src/renderer/src/lib/api.ts'),
  store: resolve('src/renderer/src/lib/store.ts'),
  backendRoutes: resolve('backend/app/routes.py'),
  backendProcessing: resolve('backend/app/processing.py'),
  processingTypes: resolve('src/shared/processing.ts'),
  readme: resolve('README.md'),
  readmeZh: resolve('README.zh.md'),
  featuresDoc: resolve('docs/psrchive-features.md'),
  featuresDocZh: resolve('docs/psrchive-features.zh.md'),
  guideDoc: resolve('docs/processing-guide.md'),
  guideDocZh: resolve('docs/processing-guide.zh.md')
}

for (const [label, file] of Object.entries(files)) {
  assert(existsSync(file), `Expected ${label} file at ${file}.`)
}

const appSource = readFileSync(files.app, 'utf8')
const inspectorSource = readFileSync(files.inspector, 'utf8')
const apiSource = readFileSync(files.api, 'utf8')
const storeSource = readFileSync(files.store, 'utf8')
const backendRoutesSource = readFileSync(files.backendRoutes, 'utf8')
const backendProcessingSource = readFileSync(files.backendProcessing, 'utf8')
const processingTypesSource = readFileSync(files.processingTypes, 'utf8')
const readmeSource = readFileSync(files.readme, 'utf8')
const readmeZhSource = readFileSync(files.readmeZh, 'utf8')

for (const symbol of [
  'ProcessingInspector',
  'createSession',
  'updateSessionRecipe',
  'exportSessionArchive',
  'runSessionToa',
  'commitProcessingRecipe',
  'handleRunToa'
]) {
  assert(appSource.includes(symbol), `Expected App.tsx to include ${symbol}.`)
}

for (const symbol of [
  'Zap',
  'Pam',
  'TOA',
  'Cal',
  'Batch',
  'handleRunBatch',
  'handleCalibrationPreview'
]) {
  assert(inspectorSource.includes(symbol), `Expected ProcessingInspector.tsx to include ${symbol}.`)
}

for (const endpoint of [
  '/api/capabilities',
  '/api/sessions',
  '/preview/metadata',
  '/preview/profile',
  '/preview/waterfall',
  '/preview/time-phase',
  '/preview/bandpass',
  '/export',
  '/toa',
  '/calibration/preview'
]) {
  assert(apiSource.includes(endpoint), `Expected api.ts to include ${endpoint}.`)
  assert(backendRoutesSource.includes(endpoint.split('/api').pop() || endpoint), `Expected routes.py to include ${endpoint}.`)
}

for (const atomName of [
  'currentSessionIdAtom',
  'processingCapabilitiesAtom',
  'processingRecipeAtom',
  'processingHistoryAtom',
  'processingRedoHistoryAtom',
  'processingInspectorOpenAtom',
  'toaResultAtom'
]) {
  assert(storeSource.includes(atomName), `Expected store.ts to define ${atomName}.`)
}

for (const typeName of [
  'ProcessingRecipe',
  'ProcessingCapabilities',
  'ToaRequest',
  'ToaResult',
  'BatchRecipe'
]) {
  assert(processingTypesSource.includes(typeName), `Expected processing.ts to define ${typeName}.`)
}

assert(backendProcessingSource.includes('ProcessingSessionManager'), 'Expected processing.py to define ProcessingSessionManager.')
assert(backendProcessingSource.includes('run_toa'), 'Expected processing.py to support run_toa().')
assert(backendProcessingSource.includes('export_archive'), 'Expected processing.py to support export_archive().')

for (const docLink of [
  'docs/processing-guide.md',
  'docs/psrchive-features.md',
  'docs/processing-guide.zh.md',
  'docs/psrchive-features.zh.md'
]) {
  assert(readmeSource.includes(docLink) || readmeZhSource.includes(docLink), `Expected README files to link ${docLink}.`)
}

console.log('Processing workflow checks passed.')
