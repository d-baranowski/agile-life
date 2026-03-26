import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc.types'
import type { IpcResult } from '@shared/ipc.types'
import type { BoardConfig, BoardConfigInput } from '@shared/board.types'
import type { TrelloBoard, TrelloList, TrelloCard, TrelloMember } from '@shared/trello.types'
import { getAllBoards, addBoard, updateBoard, deleteBoard, getBoardById } from '../database/db'
import { TrelloClient } from '../trello/client'

export function registerBoardHandlers(): void {
  // List all registered boards
  ipcMain.handle(IPC_CHANNELS.BOARDS_GET_ALL, async (): Promise<IpcResult<BoardConfig[]>> => {
    try {
      const boards = getAllBoards()
      return { success: true, data: boards }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // Add a new board registration
  ipcMain.handle(
    IPC_CHANNELS.BOARDS_ADD,
    async (_event, input: BoardConfigInput): Promise<IpcResult<BoardConfig>> => {
      try {
        const board = addBoard(input)
        return { success: true, data: board }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Update an existing board registration
  ipcMain.handle(
    IPC_CHANNELS.BOARDS_UPDATE,
    async (
      _event,
      boardId: string,
      updates: Partial<BoardConfigInput>
    ): Promise<IpcResult<BoardConfig>> => {
      try {
        const board = updateBoard(boardId, updates)
        return { success: true, data: board }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Delete a board registration
  ipcMain.handle(
    IPC_CHANNELS.BOARDS_DELETE,
    async (_event, boardId: string): Promise<IpcResult<void>> => {
      try {
        deleteBoard(boardId)
        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Fetch boards available to this API key from Trello
  ipcMain.handle(
    IPC_CHANNELS.BOARDS_FETCH_FROM_TRELLO,
    async (
      _event,
      apiKey: string,
      apiToken: string
    ): Promise<IpcResult<TrelloBoard[]>> => {
      try {
        const client = new TrelloClient(apiKey, apiToken)
        const validation = await client.validateCredentials()
        if (!validation.valid) {
          return { success: false, error: 'Invalid Trello API credentials' }
        }
        const boards = await client.getMemberBoards()
        return { success: true, data: boards }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Sync all Trello data for a board into the local database
  ipcMain.handle(
    IPC_CHANNELS.TRELLO_SYNC,
    async (_event, boardId: string): Promise<IpcResult<void>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board ${boardId} not found` }

        const client = new TrelloClient(config.apiKey, config.apiToken)

        const [lists, members, cards, actions] = await Promise.all([
          client.getLists(boardId),
          client.getMembers(boardId),
          client.getAllCards(boardId),
          client.getActions(boardId)
        ])

        const { upsertLists, upsertMembers, upsertCards, upsertActions } = await import(
          '../database/db'
        )
        upsertLists(boardId, lists)
        upsertMembers(boardId, members)
        upsertCards(boardId, cards)
        upsertActions(boardId, actions)

        return { success: true }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Fetch just the lists for a board from Trello (live)
  ipcMain.handle(
    IPC_CHANNELS.TRELLO_GET_LISTS,
    async (_event, boardId: string): Promise<IpcResult<TrelloList[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board ${boardId} not found` }
        const client = new TrelloClient(config.apiKey, config.apiToken)
        const lists = await client.getLists(boardId)
        return { success: true, data: lists }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Fetch cards for a board from Trello (live)
  ipcMain.handle(
    IPC_CHANNELS.TRELLO_GET_CARDS,
    async (_event, boardId: string): Promise<IpcResult<TrelloCard[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board ${boardId} not found` }
        const client = new TrelloClient(config.apiKey, config.apiToken)
        const cards = await client.getCards(boardId)
        return { success: true, data: cards }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )

  // Fetch members for a board from Trello (live)
  ipcMain.handle(
    IPC_CHANNELS.TRELLO_GET_MEMBERS,
    async (_event, boardId: string): Promise<IpcResult<TrelloMember[]>> => {
      try {
        const config = getBoardById(boardId)
        if (!config) return { success: false, error: `Board ${boardId} not found` }
        const client = new TrelloClient(config.apiKey, config.apiToken)
        const members = await client.getMembers(boardId)
        return { success: true, data: members }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
  )
}
