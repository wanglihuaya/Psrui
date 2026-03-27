import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const source = readFileSync(resolve('src/renderer/src/components/SettingsPanel.tsx'), 'utf8')

for (const category of [
  'App',
  'Appearance',
  'Workspace',
  'Backend',
  'Shortcuts',
  'About'
]) {
  assert(source.includes(category), `Expected settings center category ${category}.`)
}

assert(source.includes('Desktop notifications'), 'Expected disabled notifications setting placeholder.')
assert(source.includes('Keep screen awake'), 'Expected disabled power setting placeholder.')
assert(source.includes('HTTP proxy'), 'Expected disabled network setting placeholder.')
assert(source.includes('Check for Updates'), 'Expected settings center to include update action.')
assert(source.includes('Restart Backend'), 'Expected settings center to include backend restart action.')

console.log('Settings center checks passed.')
