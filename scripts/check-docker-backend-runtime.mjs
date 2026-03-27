import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const backendSource = readFileSync(resolve('src/main/backend.ts'), 'utf8')
const sharedBackendSource = readFileSync(resolve('src/shared/backend.ts'), 'utf8')
const packageSource = readFileSync(resolve('package.json'), 'utf8')
const readmeSource = readFileSync(resolve('README.md'), 'utf8')
const backendDocsSource = readFileSync(resolve('docs/backend.md'), 'utf8')

assert(
  backendSource.includes('PSRCHIVE_DOCKER_IMAGE') && sharedBackendSource.includes('alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04'),
  'Expected backend runtime to reference the Docker PSRCHIVE image.'
)
assert(
  backendSource.includes('PSRCHIVE_BACKEND_RUNTIME'),
  'Expected backend runtime selection to use PSRCHIVE_BACKEND_RUNTIME.'
)
assert(
  backendSource.includes("spawn('docker'"),
  'Expected backend runtime to launch Docker when configured.'
)
assert(
  packageSource.includes('backend:docker'),
  'Expected package.json to expose a backend:docker script.'
)
assert(
  packageSource.includes('backend:docker:pull'),
  'Expected package.json to expose a backend:docker:pull script.'
)
assert(
  readmeSource.includes('alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04'),
  'Expected README to document the Docker PSRCHIVE image.'
)
assert(
  backendDocsSource.includes('PSRCHIVE_BACKEND_RUNTIME'),
  'Expected backend docs to describe the Docker runtime selector.'
)

console.log('Docker backend runtime checks passed.')
