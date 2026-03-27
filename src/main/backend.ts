import { spawn, spawnSync, type ChildProcess } from 'child_process'
import { existsSync } from 'fs'
import http from 'http'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { PSRCHIVE_DOCKER_IMAGE, type BackendRuntime } from '../shared/backend'

const CONTAINER_WORKDIR = '/workspace/backend'
const HOST_PATH_MOUNTS = ['/Users', '/Volumes', '/private', '/tmp']

export class BackendProcess {
  private process: ChildProcess | null = null
  private port: number
  private running = false
  private runtime: BackendRuntime = 'local'
  private containerName: string

  constructor(port: number) {
    this.port = port
    this.containerName = `psrchive-viewer-backend-${port}`
  }

  isRunning(): boolean {
    return this.running
  }

  getRuntime(): BackendRuntime {
    return this.runtime
  }

  async start(): Promise<void> {
    if (this.running) return

    const backendDir = is.dev
      ? join(__dirname, '../../backend')
      : join(process.resourcesPath, 'backend')

    this.runtime = this.resolveRuntime()
    this.process = this.runtime === 'docker'
      ? this.spawnDockerBackend(backendDir)
      : this.spawnLocalBackend(backendDir)

    this.attachProcessLogging(this.process)

    await this.waitForReady()
    this.running = true
    console.log(`[backend] ready on port ${this.port} via ${this.runtime}`)
  }

  stop(): void {
    if (this.runtime === 'docker') {
      this.stopDockerContainer()
    }

    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }

    this.running = false
  }

  async restart(): Promise<void> {
    this.stop()
    await new Promise((resolve) => setTimeout(resolve, 500))
    await this.start()
  }

  private resolveRuntime(): BackendRuntime {
    const requestedRuntime = process.env['PSRCHIVE_BACKEND_RUNTIME']?.trim().toLowerCase()
    return requestedRuntime === 'docker' ? 'docker' : 'local'
  }

  private spawnLocalBackend(backendDir: string): ChildProcess {
    const pythonPath = process.env['PSRCHIVE_BACKEND_PYTHON'] || 'python3'

    console.log(`[backend] starting local runtime with ${pythonPath}`)

    return spawn(
      pythonPath,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(this.port)],
      {
        cwd: backendDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )
  }

  private spawnDockerBackend(backendDir: string): ChildProcess {
    const args = [
      'run',
      '--rm',
      '--name',
      this.containerName,
      '--publish',
      `127.0.0.1:${this.port}:${this.port}`,
      '--workdir',
      CONTAINER_WORKDIR,
      '--env',
      'PYTHONUNBUFFERED=1',
      '--env',
      'PYTHONDONTWRITEBYTECODE=1',
      '--mount',
      `type=volume,source=psrchive-viewer-pip-cache,target=/root/.cache/pip`,
      '--volume',
      `${backendDir}:${CONTAINER_WORKDIR}`,
      ...this.getHostMountArgs(),
      PSRCHIVE_DOCKER_IMAGE,
      '/bin/bash',
      '-lc',
      [
        '(python3 -c "import fastapi,uvicorn,numpy" >/dev/null 2>&1 || python3 -m pip install --disable-pip-version-check -r requirements.txt)',
        `exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port ${this.port}`
      ].join(' && ')
    ]

    this.stopDockerContainer()
    console.log(`[backend] starting docker runtime with ${PSRCHIVE_DOCKER_IMAGE}`)
    return spawn('docker', args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
  }

  private getHostMountArgs(): string[] {
    const args: string[] = []

    for (const hostPath of HOST_PATH_MOUNTS) {
      if (existsSync(hostPath)) {
        args.push('--volume', `${hostPath}:${hostPath}`)
      }
    }

    return args
  }

  private stopDockerContainer(): void {
    spawnSync('docker', ['rm', '-f', this.containerName], {
      env: process.env,
      stdio: 'ignore'
    })
  }

  private attachProcessLogging(process: ChildProcess | null): void {
    process?.stdout?.on('data', (data: Buffer) => {
      console.log(`[backend] ${data.toString().trim()}`)
    })

    process?.stderr?.on('data', (data: Buffer) => {
      console.error(`[backend] ${data.toString().trim()}`)
    })

    process?.on('close', (code) => {
      console.log(`[backend] exited with code ${code}`)
      this.running = false
    })

    process?.on('error', (err) => {
      console.error('[backend] failed to start:', err)
      this.running = false
    })
  }

  private waitForReady(timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now()

      const check = (): void => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Backend startup timeout (${this.runtime})`))
          return
        }

        const req = http.get(`http://127.0.0.1:${this.port}/api/health`, (res) => {
          if (res.statusCode === 200) {
            resolve()
          } else {
            setTimeout(check, 400)
          }
        })

        req.on('error', () => {
          setTimeout(check, 400)
        })

        req.end()
      }

      setTimeout(check, this.runtime === 'docker' ? 1200 : 500)
    })
  }
}
