import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const source = readFileSync(resolve('backend/app/data_provider.py'), 'utf8')

assert(
  source.includes('get_Integration(0)') && source.includes('get_folding_period()'),
  'Expected metadata period extraction to use get_Integration(0) with get_folding_period().'
)

assert(
  !source.includes('integration(0).get_folding_period()'),
  'Expected deprecated integration(0) accessor to be removed from metadata extraction.'
)

console.log('PSRCHIVE metadata accessor checks passed.')
