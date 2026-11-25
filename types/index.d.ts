export type Status = 'idle' | 'working' | 'done' | 'error'

declare module 'claude-code' {
  interface PluginState {
    'prompt-master-button': { status: Status; original: string | null; message: string }
  }
}
