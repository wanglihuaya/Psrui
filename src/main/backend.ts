import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import http from 'http'

export class BackendProcess {
  private process: ChildProcess | null = null
  private port: number
  private running = false

  constructor(port: number) {
    this.port = port
  }

  isRunning(): boolean {
    return this.running
  }

  async start(): Promise<void> {
    if (this.running) return

    const backendDir = is.dev
      ? join(__dirname, '../../backend')
      : join(process.resourcesPath, 'backend')

    const pythonPath = 'python3'

    this.process = spawn(
      pythonPath,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(this.port)],
      {
        cwd: backendDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )

    this.process.stdout?.on('data', (data: Buffer) => {
      console.log(`[backend] ${data.toString().trim()}`)
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error(`[backend] ${data.toString().trim()}`)
    })

    this.process.on('close', (code) => {
      console.log(`[backend] exited with code ${code}`)
      this.running = false
    })

    this.process.on('error', (err) => {
      console.error(`[backend] failed to start:`, err)
      this.running = false
    })

    await this.waitForReady()
    this.running = true
    console.log(`[backend] ready on port ${this.port}`)
  }

  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
      this.running = false
    }
  }

  async restart(): Promise<void> {
    this.stop()
    await new Promise((r) => setTimeout(r, 500))
    await this.start()
  }

  private waitForReady(timeout = 15000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now()

      const check = (): void => {
        if (Date.now() - start > timeout) {
          reject(new Error('Backend startup timeout'))
          return
        }

        const req = http.get(`http://127.0.0.1:${this.port}/api/health`, (res) => {
          if (res.statusCode === 200) {
            resolve()
          } else {
            setTimeout(check, 300)
          }
        })

        req.on('error', () => {
          setTimeout(check, 300)
        })

        req.end()
      }

      setTimeout(check, 500)
    })
  }
}
