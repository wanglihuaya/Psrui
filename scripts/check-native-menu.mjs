import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const source = readFileSync(resolve('src/main/index.ts'), 'utf8')

for (const token of [
  'Menu.buildFromTemplate',
  'Menu.setApplicationMenu',
  "label: app.getName()",
  "label: 'File'",
  "label: 'View'",
  "label: 'Window'",
  "label: 'Help'",
  "label: 'Debug'",
  "role: 'toggleDevTools'",
  "role: 'reload'",
  "role: 'forceReload'"
]) {
  assert(source.includes(token), `Expected native menu setup to include ${token}.`)
}

console.log('Native menu checks passed.')
