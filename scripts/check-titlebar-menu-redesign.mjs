import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const source = readFileSync(resolve('src/renderer/src/components/TitleBar.tsx'), 'utf8')

assert(source.includes('Toggle Sidebar'), 'Expected title bar to include a Toggle Sidebar entry.')
assert(source.includes('DropdownMenu'), 'Expected title bar redesign to use a dropdown menu component.')
assert(source.includes('New Window'), 'Expected title bar command menu to include New Window.')
assert(source.includes('Window'), 'Expected title bar command menu to include Window submenu.')
assert(source.includes('Quit'), 'Expected title bar command menu to include Quit.')

console.log('Title bar redesign checks passed.')
