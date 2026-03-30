import type { KanbanCard } from '../trello/trello.types'
import type { StoryPointRule } from './board.types'

/**
 * Returns the story-point value for a card based on its labels.
 * Mirrors the server-side `cardStoryPoints` function in analytics.ts.
 * Falls back to 1 when no label matches any configured rule.
 */
export function cardStoryPoints(card: KanbanCard, config: StoryPointRule[]): number {
  if (!config || config.length === 0) return 1
  const rulesMap = new Map(config.map((r) => [r.labelName.trim().toLowerCase(), r.points]))
  for (const label of card.labels) {
    const pts = rulesMap.get((label.name || '').trim().toLowerCase())
    if (pts !== undefined) return pts
  }
  return 1
}
