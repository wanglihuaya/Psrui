export const APP_COMMAND_IDS = [
  'new-window',
  'open-file',
  'open-workspace',
  'close-file',
  'save-image',
  'save-archive',
  'view-profile',
  'view-waterfall',
  'view-time-phase',
  'view-bandpass',
  'view-psrcat',
  'toggle-sidebar',
  'open-settings',
  'open-help',
  'check-for-updates',
  'update-action',
  'window-minimize',
  'window-toggle-full-screen',
  'app-quit',
  'debug-reload',
  'debug-force-reload',
  'debug-toggle-devtools'
] as const

export type AppCommandId = (typeof APP_COMMAND_IDS)[number]

export const RENDERER_OWNED_COMMANDS: AppCommandId[] = [
  'open-file',
  'open-workspace',
  'close-file',
  'save-image',
  'save-archive',
  'view-profile',
  'view-waterfall',
  'view-time-phase',
  'view-bandpass',
  'view-psrcat',
  'toggle-sidebar',
  'open-settings',
  'open-help',
  'check-for-updates',
  'update-action'
]

export const MAIN_OWNED_COMMANDS: AppCommandId[] = [
  'new-window',
  'window-minimize',
  'window-toggle-full-screen',
  'app-quit',
  'debug-reload',
  'debug-force-reload',
  'debug-toggle-devtools'
]

export function isRendererOwnedCommand(commandId: AppCommandId): boolean {
  return RENDERER_OWNED_COMMANDS.includes(commandId)
}
