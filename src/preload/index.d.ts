import { ElectronAPI } from '@electron-toolkit/preload'
import type { IPC_CHANNELS } from '@shared/ipc.types'

type Channel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

interface Api {
  invoke: (channel: Channel, ...args: unknown[]) => Promise<unknown>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
