import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const commandsPath = resolve('src/shared/commands.ts')
assert(existsSync(commandsPath), 'Expected shared command definition file at src/shared/commands.ts.')

const commandsSource = readFileSync(commandsPath, 'utf8')
const preloadSource = readFileSync(resolve('src/preload/index.ts'), 'utf8')
const appSource = readFileSync(resolve('src/renderer/src/App.tsx'), 'utf8')
const shortcutsSource = readFileSync(resolve('src/renderer/src/lib/shortcuts.ts'), 'utf8')
const mainSource = readFileSync(resolve('src/main/index.ts'), 'utf8')

for (const commandId of [
  'new-window',
  'open-file',
  'open-workspace',
  'close-file',
  'save-image',
  'save-archive',
  'view-profile',
  'view-waterfall',
  'view-time-phase',
  'view-bandpass',
  'view-psrcat',
  'toggle-sidebar',
  'open-settings',
  'open-help',
  'check-for-updates',
  'update-action',
  'window-minimize',
  'window-toggle-full-screen',
  'app-quit',
  'debug-reload',
  'debug-force-reload',
  'debug-toggle-devtools'
]) {
  assert(
    commandsSource.includes(`'${commandId}'`),
    `Expected shared commands to include ${commandId}.`
  )
}

assert(preloadSource.includes('onAppCommand'), 'Expected preload API to expose onAppCommand().')
assert(mainSource.includes("'app:command'"), 'Expected main process to send app:command events.')
assert(appSource.includes('commandHandlers'), 'Expected App.tsx to define a unified commandHandlers map.')
assert(shortcutsSource.includes('commandId'), 'Expected shortcut definitions to map to shared command ids.')

console.log('Command system checks passed.')
