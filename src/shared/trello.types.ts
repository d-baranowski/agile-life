export interface TrelloBoard {
  id: string
  name: string
  desc: string
  url: string
  closed: boolean
  prefs?: {
    backgroundColor: string
    backgroundImage?: string
  }
}

export interface TrelloList {
  id: string
  name: string
  idBoard: string
  closed: boolean
  pos: number
}

export interface TrelloLabel {
  id: string
  name: string
  color: string
  idBoard: string
}

export interface TrelloMember {
  id: string
  fullName: string
  username: string
  avatarUrl?: string
}

export interface TrelloCard {
  id: string
  name: string
  desc: string
  idBoard: string
  idList: string
  idLabels: string[]
  idMembers: string[]
  labels: TrelloLabel[]
  members: TrelloMember[]
  closed: boolean
  dateLastActivity: string
  due: string | null
  dueComplete: boolean
  pos: number
  shortUrl: string
  url: string
}

export interface TrelloAction {
  id: string
  type: string
  date: string
  data: {
    card?: {
      id: string
      name: string
      idShort: number
    }
    /** Present on createCard actions — the list the card was created in. */
    list?: {
      id: string
      name: string
    }
    listBefore?: TrelloList
    listAfter?: TrelloList
    board?: {
      id: string
      name: string
    }
  }
  memberCreator: TrelloMember
}
