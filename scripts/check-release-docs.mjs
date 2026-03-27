import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const workflow = readFileSync(resolve('.github/workflows/release.yml'), 'utf8')
const readme = readFileSync(resolve('README.md'), 'utf8')

assert(
  workflow.includes('%(contents)'),
  'Expected release workflow to read annotated tag contents for stable release notes.'
)

assert(
  /annotated tag/i.test(readme),
  'Expected README release section to document annotated tags for stable release descriptions.'
)

assert(
  /git tag -a v\d+\.\d+\.\d+/i.test(readme),
  'Expected README to show an annotated git tag example for stable releases.'
)

console.log('Release docs checks passed.')
