import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const filePath = resolve('src/main/index.ts')
const source = readFileSync(filePath, 'utf8')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

assert(
  /titleBarStyle:\s*'hiddenInset'/.test(source),
  'Expected BrowserWindow to keep using hiddenInset on macOS.'
)

const match = /trafficLightPosition:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}/m.exec(source)
assert(match, 'Expected BrowserWindow to define trafficLightPosition explicitly.')

const [, x, y] = match

assert(x === '16', `Expected trafficLightPosition.x to stay at 16, received ${x}.`)
assert(
  y === '16',
  `Expected trafficLightPosition.y to be 16 so native controls align with the custom 47px title bar, received ${y}.`
)

console.log('BrowserWindow title bar checks passed.')
