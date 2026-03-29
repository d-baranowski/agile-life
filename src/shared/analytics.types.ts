export interface ColumnCount {
  listId: string
  listName: string
  cardCount: number
}

export interface WeeklyUserStats {
  week: string
  userId: string | null
  userName: string
  closedCount: number
}

export interface LabelUserStats {
  labelName: string
  labelColor: string
  userId: string | null
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

/** One data-point in the 12-month completion history: one row per (week, user). */
export interface WeeklyHistory {
  week: string
  userId: string | null
  userName: string
  closedCount: number
}

/** Story points completed by a single user in the last 7 days. */
export interface StoryPointsUserStats {
  userId: string | null
  userName: string
  storyPoints: number
}

/** Story points completed per epic per week over the past 12 months. */
export interface EpicWeeklyHistory {
  week: string
  epicCardId: string
  epicCardName: string
  storyPoints: number
}
