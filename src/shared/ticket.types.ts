export interface UnnumberedCard {
  cardId: string
  cardName: string
  listName: string
  proposedName: string
}

export interface TicketNumberingConfig {
  projectCode: string
  nextTicketNumber: number
  unnumberedCount: number
}

export interface ApplyNumberingResult {
  updated: number
  failed: number
  errors: string[]
}
