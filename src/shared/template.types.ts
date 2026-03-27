/**
 * Types for ticket template groups and individual ticket templates.
 *
 * Templates support mustache-style placeholders that are resolved at
 * card-generation time:
 *   {{week}}       – zero-padded ISO week number (01–53)
 *   {{year}}       – 4-digit year
 *   {{month}}      – zero-padded month number (01–12)
 *   {{month_name}} – full month name (e.g. "March")
 *   {{date}}       – ISO date string (YYYY-MM-DD)
 */

export interface TemplateGroup {
  id: number
  boardId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface TicketTemplate {
  id: number
  boardId: string
  groupId: number
  name: string
  /** Card title — may contain {{week}}, {{year}}, etc. */
  titleTemplate: string
  /** Optional card description — may contain placeholders. */
  descTemplate: string
  /** Trello list ID where the generated card should be created. */
  listId: string
  /** Display name of the target list (cached for readability). */
  listName: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface TemplateGroupInput {
  name: string
}

export interface TicketTemplateInput {
  groupId: number
  name: string
  titleTemplate: string
  descTemplate?: string
  listId: string
  listName: string
  position?: number
}

export interface GenerateCardsResult {
  created: number
  failed: number
  errors: string[]
}
