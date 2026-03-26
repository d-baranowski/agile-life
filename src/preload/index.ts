import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { IPC_CHANNELS } from '@shared/ipc.types'

type Channel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// Expose a typed `api` object to the renderer via contextBridge.
// This keeps the renderer sandboxed while giving it access to IPC.
const api = {
  invoke: (channel: Channel, ...args: unknown[]): Promise<unknown> =>
    ipcRenderer.invoke(channel, ...args)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}
