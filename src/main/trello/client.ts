import axios, { AxiosInstance } from 'axios'
import type {
  TrelloBoard,
  TrelloList,
  TrelloCard,
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
   * Updates a card's name via the Trello API.
   */
  async updateCardName(cardId: string, name: string): Promise<TrelloCard> {
    const { data } = await this.http.put<TrelloCard>(`/cards/${cardId}`, { name })
    return data
  }

  /**
   * Archives (closes) a card on Trello.
   */
  async archiveCard(cardId: string): Promise<TrelloCard> {
    const { data } = await this.http.put<TrelloCard>(`/cards/${cardId}`, { closed: true })
    return data
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
