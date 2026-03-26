/// <reference types="vite/client" />

interface Window {
  electron: import('../../../preload/index').ElectronAPI
}
