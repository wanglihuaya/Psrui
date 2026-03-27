import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const workflow = readFileSync(resolve('.github/workflows/release.yml'), 'utf8')

assert(
  workflow.includes('npm version --no-git-tag-version'),
  'Expected release workflow to rewrite package version before packaging.'
)
assert(
  workflow.includes('nightly.') || workflow.includes('nightly-${'),
  'Expected release workflow to generate a unique nightly semver prerelease version.'
)
assert(
  workflow.includes('app_version'),
  'Expected release workflow to compute and export an app_version value for packaging.'
)

console.log('Release versioning checks passed.')
