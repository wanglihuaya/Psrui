import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const preload = readFileSync(resolve('src/preload/index.ts'), 'utf8')
const main = readFileSync(resolve('src/main/index.ts'), 'utf8')
const updater = readFileSync(resolve('src/main/updater.ts'), 'utf8')
const app = readFileSync(resolve('src/renderer/src/App.tsx'), 'utf8')

for (const token of [
  'getUpdateState',
  'checkForUpdates',
  'downloadUpdate',
  'installUpdate',
  'onUpdateState'
]) {
  assert(preload.includes(token), `Expected preload ElectronAPI to expose ${token}.`)
}

for (const channel of [
  'updates:getState',
  'updates:check',
  'updates:download',
  'updates:install'
]) {
  assert(main.includes(channel), `Expected main process to register IPC channel ${channel}.`)
}

for (const token of ['checkForUpdates()', 'downloadUpdate()', 'quitAndInstall()']) {
  assert(updater.includes(token), `Expected updater manager to use ${token}.`)
}

assert(
  app.includes('window.electron.getUpdateState') || app.includes('window.electron?.getUpdateState'),
  'Expected renderer to fetch updater state from preload.'
)
assert(
  app.includes('window.electron.onUpdateState'),
  'Expected renderer to subscribe to updater state changes.'
)

console.log('Update IPC checks passed.')
