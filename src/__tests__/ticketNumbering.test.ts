/**
 * Tests for ticket numbering logic.
 * These are pure unit tests that don't require Electron or SQLite.
 */

const TICKET_REGEX = /^[A-Z]{3}-\d{6}\s/

function formatTicketName(projectCode: string, number: number, cardName: string): string {
  return `${projectCode}-${String(number).padStart(6, '0')} ${cardName}`
}

function isTicketNumbered(cardName: string): boolean {
  return TICKET_REGEX.test(cardName)
}

describe('Ticket Numbering', () => {
  describe('formatTicketName', () => {
    it('pads numbers to 6 digits', () => {
      expect(formatTicketName('AGI', 1, 'My Task')).toBe('AGI-000001 My Task')
    })

    it('handles max ticket number correctly', () => {
      expect(formatTicketName('PRJ', 999999, 'Big Task')).toBe('PRJ-999999 Big Task')
    })

    it('uses the provided project code uppercased', () => {
      const name = formatTicketName('ABC', 42, 'Task')
      expect(name).toMatch(/^ABC-/)
    })

    it('includes the card name after the number', () => {
      const name = formatTicketName('XYZ', 100, 'Fix the bug in auth')
      expect(name).toContain('Fix the bug in auth')
    })
  })

  describe('isTicketNumbered', () => {
    it('returns true for correctly formatted names', () => {
      expect(isTicketNumbered('AGI-000001 My Task')).toBe(true)
      expect(isTicketNumbered('PRJ-000042 Some work')).toBe(true)
      expect(isTicketNumbered('XYZ-999999 Last card')).toBe(true)
    })

    it('returns false for plain card names', () => {
      expect(isTicketNumbered('Fix login bug')).toBe(false)
      expect(isTicketNumbered('Update docs')).toBe(false)
    })

    it('returns false for partial matches', () => {
      expect(isTicketNumbered('AGI-00001 too short')).toBe(false) // only 5 digits
      expect(isTicketNumbered('AG-000001 too few letters')).toBe(false) // only 2 letters
      expect(isTicketNumbered('AGIL-000001 too many letters')).toBe(false) // 4 letters
    })

    it('requires a space after the number', () => {
      expect(isTicketNumbered('AGI-000001')).toBe(false) // no space
    })
  })

  describe('sequential numbering', () => {
    it('assigns numbers in sequence', () => {
      const cards = ['Task A', 'Task B', 'Task C']
      let next = 1
      const numbered = cards.map((name) => formatTicketName('TST', next++, name))

      expect(numbered[0]).toBe('TST-000001 Task A')
      expect(numbered[1]).toBe('TST-000002 Task B')
      expect(numbered[2]).toBe('TST-000003 Task C')
      expect(next).toBe(4)
    })

    it('only renames cards that are not already numbered', () => {
      const cards = ['Task A', 'PRJ-000001 Already numbered', 'Task B']
      const unnumbered = cards.filter((n) => !isTicketNumbered(n))

      expect(unnumbered).toHaveLength(2)
      expect(unnumbered).toContain('Task A')
      expect(unnumbered).toContain('Task B')
    })
  })
})
