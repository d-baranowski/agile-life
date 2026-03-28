import axios, { AxiosInstance } from 'axios'
import type {
  TrelloBoard,
  TrelloList,
  TrelloCard,
  TrelloLabel,
  TrelloMember,
  TrelloAction
} from '@shared/trello.types'

const TRELLO_BASE_URL = 'https://api.trello.com/1'

/**
 * Thin wrapper around the Trello REST API.
 * Each instance is scoped to a single (apiKey, apiToken) pair.
 */
export class TrelloClient {
  private readonly http: AxiosInstance

  constructor(
    private readonly apiKey: string,
    private readonly apiToken: string
  ) {
    this.http = axios.create({
      baseURL: TRELLO_BASE_URL,
      params: { key: this.apiKey, token: this.apiToken }
    })
  }

  // ─── Boards ─────────────────────────────────────────────────────────────────

  async getBoard(boardId: string): Promise<TrelloBoard> {
    const { data } = await this.http.get<TrelloBoard>(`/boards/${boardId}`, {
      params: { fields: 'id,name,desc,url,closed,prefs' }
    })
    return data
  }

  async getMemberBoards(): Promise<TrelloBoard[]> {
    const { data } = await this.http.get<TrelloBoard[]>('/members/me/boards', {
      params: { filter: 'open', fields: 'id,name,desc,url,closed' }
    })
    return data
  }

  // ─── Lists ───────────────────────────────────────────────────────────────────

  async getLists(boardId: string): Promise<TrelloList[]> {
    const { data } = await this.http.get<TrelloList[]>(`/boards/${boardId}/lists`, {
      params: { filter: 'open', fields: 'id,name,idBoard,closed,pos' }
    })
    return data
  }

  // ─── Cards ───────────────────────────────────────────────────────────────────

  async getCards(boardId: string): Promise<TrelloCard[]> {
    const { data } = await this.http.get<TrelloCard[]>(`/boards/${boardId}/cards`, {
      params: {
        filter: 'open',
        fields:
          'id,name,desc,idBoard,idList,idLabels,idMembers,labels,closed,dateLastActivity,due,dueComplete,pos,shortUrl,url',
        members: 'true',
        member_fields: 'id,fullName,username,avatarUrl'
      }
    })
    return data
  }

  /**
   * Fetch all cards including archived ones (needed for historical analytics).
   */
  async getAllCards(boardId: string): Promise<TrelloCard[]> {
    const { data } = await this.http.get<TrelloCard[]>(`/boards/${boardId}/cards`, {
      params: {
        filter: 'all',
        fields:
          'id,name,desc,idBoard,idList,idLabels,idMembers,labels,closed,dateLastActivity,due,dueComplete,pos,shortUrl,url',
        members: 'true',
        member_fields: 'id,fullName,username,avatarUrl'
      }
    })
    return data
  }

  // ─── Members ─────────────────────────────────────────────────────────────────

  async getMembers(boardId: string): Promise<TrelloMember[]> {
    const { data } = await this.http.get<TrelloMember[]>(`/boards/${boardId}/members`, {
      params: { fields: 'id,fullName,username,avatarUrl' }
    })
    return data
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Fetches card movement actions from a board.
   * Pages through all results (Trello returns max 1000 per call).
   */
  async getActions(
    boardId: string,
    options: { since?: string; before?: string } = {}
  ): Promise<TrelloAction[]> {
    const allActions: TrelloAction[] = []
    let before: string | undefined = options.before

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const params: Record<string, string | number> = {
        filter: 'updateCard:idList,createCard,convertToCardFromCheckItem',
        limit: 1000,
        fields: 'id,type,date,data,memberCreator'
      }
      if (options.since) params.since = options.since
      if (before) params.before = before

      const { data } = await this.http.get<TrelloAction[]>(`/boards/${boardId}/actions`, {
        params
      })

      allActions.push(...data)

      if (data.length < 1000) break
      before = data[data.length - 1].id
    }

    return allActions
  }

  // ─── Card Mutation ───────────────────────────────────────────────────────────

  /**
   * Creates a new card in the given list via the Trello API.
   * Pass `pos` to set its initial position; defaults to 'bottom'.
   */
  async createCard(
    name: string,
    listId: string,
    pos: number | 'top' | 'bottom' = 'bottom'
  ): Promise<TrelloCard> {
    const { data } = await this.http.post<TrelloCard>('/cards', { name, idList: listId, pos })
    return data
  }

  /**
   * Updates a card's name via the Trello API.
   */
  async updateCardName(cardId: string, name: string): Promise<TrelloCard> {
    const { data } = await this.http.put<TrelloCard>(`/cards/${cardId}`, { name })
    return data
  }

  /**
   * Moves a card to a different list via the Trello API.
   * Pass `pos` to also set the card's position within the target list.
   */
  async moveCard(cardId: string, toListId: string, pos?: number): Promise<TrelloCard> {
    const body: Record<string, unknown> = { idList: toListId }
    if (pos !== undefined) body.pos = pos
    const { data } = await this.http.put<TrelloCard>(`/cards/${cardId}`, body)
    return data
  }

  /**
   * Updates a card's position within its current list via the Trello API.
   */
  async reorderCard(cardId: string, pos: number): Promise<TrelloCard> {
    const { data } = await this.http.put<TrelloCard>(`/cards/${cardId}`, { pos })
    return data
  }

  /**
   * Archives (closes) a card on Trello.
   */
  async archiveCard(cardId: string): Promise<TrelloCard> {
    const { data } = await this.http.put<TrelloCard>(`/cards/${cardId}`, { closed: true })
    return data
  }

  /**
   * Adds a member to a card on Trello.
   */
  async addCardMember(cardId: string, memberId: string): Promise<void> {
    await this.http.post(`/cards/${cardId}/idMembers`, { value: memberId })
  }

  /**
   * Removes a member from a card on Trello.
   */
  async removeCardMember(cardId: string, memberId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}/idMembers/${memberId}`)
  }

  /**
   * Returns all labels defined on the board via the Trello API.
   */
  async getBoardLabels(boardId: string): Promise<TrelloLabel[]> {
    const { data } = await this.http.get<TrelloLabel[]>(`/boards/${boardId}/labels`, {
      params: { fields: 'id,name,color,idBoard', limit: 1000 }
    })
    return data
  }

  /**
   * Adds a label to a card on Trello.
   */
  async addCardLabel(cardId: string, labelId: string): Promise<void> {
    await this.http.post(`/cards/${cardId}/idLabels`, { value: labelId })
  }

  /**
   * Removes a label from a card on Trello.
   */
  async removeCardLabel(cardId: string, labelId: string): Promise<void> {
    await this.http.delete(`/cards/${cardId}/idLabels/${labelId}`)
  }

  // ─── Credentials Validation ──────────────────────────────────────────────────

  async validateCredentials(): Promise<{ valid: boolean; memberName?: string }> {
    try {
      const { data } = await this.http.get('/members/me', { params: { fields: 'fullName' } })
      return { valid: true, memberName: (data as { fullName: string }).fullName }
    } catch {
      return { valid: false }
    }
  }
}
