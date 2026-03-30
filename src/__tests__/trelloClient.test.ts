/**
 * Tests for the TrelloClient HTTP wrapper.
 * All network calls are intercepted via a mocked axios instance.
 */
import axios from 'axios'
import { TrelloClient } from '../trello/client'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

function makeMockHttp() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}

describe('TrelloClient', () => {
  let mockHttp: ReturnType<typeof makeMockHttp>
  let client: TrelloClient

  beforeEach(() => {
    mockHttp = makeMockHttp()
    mockedAxios.create.mockReturnValue(mockHttp as unknown as ReturnType<typeof axios.create>)
    client = new TrelloClient('test-key', 'test-token')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('creates an axios instance with the Trello base URL and credentials', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.trello.com/1',
        params: { key: 'test-key', token: 'test-token' }
      })
    })
  })

  // ─── Boards ─────────────────────────────────────────────────────────────────

  describe('getBoard', () => {
    it('returns board data', async () => {
      const board = { id: 'b1', name: 'My Board' }
      mockHttp.get.mockResolvedValue({ data: board })

      const result = await client.getBoard('b1')

      expect(mockHttp.get).toHaveBeenCalledWith('/boards/b1', expect.any(Object))
      expect(result).toEqual(board)
    })
  })

  describe('getMemberBoards', () => {
    it('returns list of member boards', async () => {
      const boards = [{ id: 'b1', name: 'Board 1' }]
      mockHttp.get.mockResolvedValue({ data: boards })

      const result = await client.getMemberBoards()

      expect(mockHttp.get).toHaveBeenCalledWith('/members/me/boards', expect.any(Object))
      expect(result).toEqual(boards)
    })
  })

  // ─── Lists ───────────────────────────────────────────────────────────────────

  describe('getLists', () => {
    it('returns lists for a board', async () => {
      const lists = [{ id: 'l1', name: 'To Do' }]
      mockHttp.get.mockResolvedValue({ data: lists })

      const result = await client.getLists('b1')

      expect(mockHttp.get).toHaveBeenCalledWith('/boards/b1/lists', expect.any(Object))
      expect(result).toEqual(lists)
    })
  })

  // ─── Cards ───────────────────────────────────────────────────────────────────

  describe('getCards', () => {
    it('returns open cards for a board', async () => {
      const cards = [{ id: 'c1', name: 'Card 1' }]
      mockHttp.get.mockResolvedValue({ data: cards })

      const result = await client.getCards('b1')

      expect(mockHttp.get).toHaveBeenCalledWith('/boards/b1/cards', expect.any(Object))
      expect(result).toEqual(cards)
    })
  })

  describe('getAllCards', () => {
    it('returns all cards (including archived) for a board', async () => {
      const cards = [{ id: 'c1', name: 'Card 1', closed: true }]
      mockHttp.get.mockResolvedValue({ data: cards })

      const result = await client.getAllCards('b1')

      expect(mockHttp.get).toHaveBeenCalledWith('/boards/b1/cards', expect.any(Object))
      expect(result).toEqual(cards)
    })
  })

  // ─── Members ─────────────────────────────────────────────────────────────────

  describe('getMembers', () => {
    it('returns board members', async () => {
      const members = [{ id: 'm1', fullName: 'Alice' }]
      mockHttp.get.mockResolvedValue({ data: members })

      const result = await client.getMembers('b1')

      expect(mockHttp.get).toHaveBeenCalledWith('/boards/b1/members', expect.any(Object))
      expect(result).toEqual(members)
    })
  })

  // ─── Actions ─────────────────────────────────────────────────────────────────

  describe('getActions', () => {
    it('returns all actions when fewer than 1000 are returned', async () => {
      const actions = [{ id: 'a1' }, { id: 'a2' }]
      mockHttp.get.mockResolvedValue({ data: actions })

      const result = await client.getActions('b1')

      expect(mockHttp.get).toHaveBeenCalledTimes(1)
      expect(result).toEqual(actions)
    })

    it('paginates until fewer than 1000 actions are returned', async () => {
      const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}` }))
      const page2 = [{ id: 'a1000' }]
      mockHttp.get.mockResolvedValueOnce({ data: page1 }).mockResolvedValueOnce({ data: page2 })

      const result = await client.getActions('b1')

      expect(mockHttp.get).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1001)
    })

    it('passes since option to each page request', async () => {
      const actions = [{ id: 'a1' }]
      mockHttp.get.mockResolvedValue({ data: actions })

      await client.getActions('b1', { since: '2024-01-01' })

      const callParams = mockHttp.get.mock.calls[0][1].params
      expect(callParams.since).toBe('2024-01-01')
    })

    it('passes before option when provided', async () => {
      const actions = [{ id: 'a1' }]
      mockHttp.get.mockResolvedValue({ data: actions })

      await client.getActions('b1', { before: 'a999' })

      const callParams = mockHttp.get.mock.calls[0][1].params
      expect(callParams.before).toBe('a999')
    })
  })

  // ─── Card mutations ──────────────────────────────────────────────────────────

  describe('createCard', () => {
    it('creates a card with name only', async () => {
      const card = { id: 'c1', name: 'New Card' }
      mockHttp.post.mockResolvedValue({ data: card })

      const result = await client.createCard('l1', 'New Card')

      expect(mockHttp.post).toHaveBeenCalledWith('/cards', { idList: 'l1', name: 'New Card' })
      expect(result).toEqual(card)
    })

    it('includes desc when provided', async () => {
      const card = { id: 'c1', name: 'New Card', desc: 'Description' }
      mockHttp.post.mockResolvedValue({ data: card })

      await client.createCard('l1', 'New Card', 'Description')

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/cards',
        expect.objectContaining({ desc: 'Description' })
      )
    })

    it('includes label IDs when provided', async () => {
      const card = { id: 'c1', name: 'New Card' }
      mockHttp.post.mockResolvedValue({ data: card })

      await client.createCard('l1', 'New Card', undefined, ['lab1', 'lab2'])

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/cards',
        expect.objectContaining({ idLabels: 'lab1,lab2' })
      )
    })

    it('does not include idLabels when array is empty', async () => {
      const card = { id: 'c1', name: 'New Card' }
      mockHttp.post.mockResolvedValue({ data: card })

      await client.createCard('l1', 'New Card', undefined, [])

      const body = mockHttp.post.mock.calls[0][1]
      expect(body.idLabels).toBeUndefined()
    })
  })

  describe('updateCardName', () => {
    it('updates a card name', async () => {
      const card = { id: 'c1', name: 'Updated Name' }
      mockHttp.put.mockResolvedValue({ data: card })

      const result = await client.updateCardName('c1', 'Updated Name')

      expect(mockHttp.put).toHaveBeenCalledWith('/cards/c1', { name: 'Updated Name' })
      expect(result).toEqual(card)
    })
  })

  describe('moveCard', () => {
    it('moves a card to another list', async () => {
      const card = { id: 'c1', idList: 'l2' }
      mockHttp.put.mockResolvedValue({ data: card })

      const result = await client.moveCard('c1', 'l2')

      expect(mockHttp.put).toHaveBeenCalledWith('/cards/c1', { idList: 'l2' })
      expect(result).toEqual(card)
    })

    it('includes pos when provided', async () => {
      const card = { id: 'c1', idList: 'l2', pos: 512 }
      mockHttp.put.mockResolvedValue({ data: card })

      await client.moveCard('c1', 'l2', 512)

      expect(mockHttp.put).toHaveBeenCalledWith('/cards/c1', expect.objectContaining({ pos: 512 }))
    })
  })

  describe('reorderCard', () => {
    it('reorders a card within its list', async () => {
      const card = { id: 'c1', pos: 256 }
      mockHttp.put.mockResolvedValue({ data: card })

      const result = await client.reorderCard('c1', 256)

      expect(mockHttp.put).toHaveBeenCalledWith('/cards/c1', { pos: 256 })
      expect(result).toEqual(card)
    })
  })

  describe('archiveCard', () => {
    it('archives (closes) a card', async () => {
      const card = { id: 'c1', closed: true }
      mockHttp.put.mockResolvedValue({ data: card })

      const result = await client.archiveCard('c1')

      expect(mockHttp.put).toHaveBeenCalledWith('/cards/c1', { closed: true })
      expect(result).toEqual(card)
    })
  })

  describe('addCardMember', () => {
    it('posts a member to a card', async () => {
      mockHttp.post.mockResolvedValue({ data: {} })

      await client.addCardMember('c1', 'm1')

      expect(mockHttp.post).toHaveBeenCalledWith('/cards/c1/idMembers', { value: 'm1' })
    })
  })

  describe('removeCardMember', () => {
    it('deletes a member from a card', async () => {
      mockHttp.delete.mockResolvedValue({ data: {} })

      await client.removeCardMember('c1', 'm1')

      expect(mockHttp.delete).toHaveBeenCalledWith('/cards/c1/idMembers/m1')
    })
  })

  // ─── Labels ──────────────────────────────────────────────────────────────────

  describe('getBoardLabels', () => {
    it('returns labels for a board', async () => {
      const labels = [{ id: 'lab1', name: 'Bug', color: 'red' }]
      mockHttp.get.mockResolvedValue({ data: labels })

      const result = await client.getBoardLabels('b1')

      expect(mockHttp.get).toHaveBeenCalledWith('/boards/b1/labels', expect.any(Object))
      expect(result).toEqual(labels)
    })
  })

  describe('addCardLabel', () => {
    it('posts a label to a card', async () => {
      mockHttp.post.mockResolvedValue({ data: {} })

      await client.addCardLabel('c1', 'lab1')

      expect(mockHttp.post).toHaveBeenCalledWith('/cards/c1/idLabels', { value: 'lab1' })
    })
  })

  describe('removeCardLabel', () => {
    it('deletes a label from a card', async () => {
      mockHttp.delete.mockResolvedValue({ data: {} })

      await client.removeCardLabel('c1', 'lab1')

      expect(mockHttp.delete).toHaveBeenCalledWith('/cards/c1/idLabels/lab1')
    })
  })

  // ─── Credentials ─────────────────────────────────────────────────────────────

  describe('validateCredentials', () => {
    it('returns valid:true with memberName on success', async () => {
      mockHttp.get.mockResolvedValue({ data: { fullName: 'Alice' } })

      const result = await client.validateCredentials()

      expect(result).toEqual({ valid: true, memberName: 'Alice' })
    })

    it('returns valid:false when the request fails', async () => {
      mockHttp.get.mockRejectedValue(new Error('Unauthorized'))

      const result = await client.validateCredentials()

      expect(result).toEqual({ valid: false })
    })
  })
})
