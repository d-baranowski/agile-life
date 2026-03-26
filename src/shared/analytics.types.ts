export interface ColumnCount {
  listId: string
  listName: string
  cardCount: number
}

export interface WeeklyUserStats {
  week: string
  userId: string
  userName: string
  closedCount: number
}

export interface LabelUserStats {
  labelName: string
  labelColor: string
  userId: string
  userName: string
  closedCount: number
}

export interface CardAgeStats {
  cardId: string
  cardName: string
  listName: string
  ageInDays: number
  assignees: string[]
}
