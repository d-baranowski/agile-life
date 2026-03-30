/// <reference types="vite/client" />

import type { IPC_CHANNELS } from './features/ipc/ipc.types'

type Channel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

interface RendererApi {
  invoke: (channel: Channel, ...args: unknown[]) => Promise<unknown>
}

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare global {
  interface Window {
    api: RendererApi
  }
}
