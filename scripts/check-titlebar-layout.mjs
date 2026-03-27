import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const filePath = resolve('src/renderer/src/components/TitleBar.tsx')
const source = readFileSync(filePath, 'utf8')

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const noUpdateBlock = /if\s*\(!updateState\)\s*\{([\s\S]*?)\n\s*\}/m.exec(source)
assert(noUpdateBlock, 'Expected UpdateButton to handle the empty update state explicitly.')
assert(
  /return\s+null\s*;?/.test(noUpdateBlock[1]),
  'Expected UpdateButton to render nothing when no update state is available.'
)

const spacerIndex = source.indexOf('titlebar-traffic-space')
const menuIndex = source.indexOf('{menus.map((menu) => (')
const updateIndex = source.indexOf('<UpdateButton')

assert(spacerIndex !== -1, 'Expected a dedicated native traffic-light spacer in TitleBar.')
assert(menuIndex !== -1, 'Expected menu rendering block in TitleBar.')
assert(updateIndex !== -1, 'Expected UpdateButton to still exist for actual updates.')
assert(
  spacerIndex < menuIndex,
  'Expected the native traffic-light spacer to appear before the menu bar.'
)
assert(
  updateIndex > menuIndex,
  'Expected UpdateButton to be rendered outside the native traffic-light spacer area.'
)

console.log('Title bar layout checks passed.')
