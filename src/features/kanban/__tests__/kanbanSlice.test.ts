jest.mock('../../api/useApi', () => ({
  api: {
    trello: {
      getBoardData: jest.fn(),
      getBoardMembers: jest.fn(),
      getBoardLabels: jest.fn()
    },
    epics: {
      getCards: jest.fn(),
      getStories: jest.fn()
    },
    analytics: {
      gamificationStats: jest.fn()
    },
    templates: {
      getGroups: jest.fn(),
      getTemplates: jest.fn(),
      generateCards: jest.fn()
    }
  }
}))

import { configureStore } from '@reduxjs/toolkit'
import reducer, {
  fetchBoardData,
  fetchEpicCards,
  fetchEpicStories,
  fetchGamificationStats,
  fetchGenerateTemplateGroups,
  fetchGenerateTemplates,
  generateCardsFromTemplate,
  columnsUpdated,
  cardRemovedFromColumn,
  cardsAddedToColumn,
  cardMembersUpdated,
  cardLabelsUpdated,
  cardEpicUpdated,
  bulkCardEpicUpdated,
  kanbanToastShown,
  kanbanToastDismissed,
  searchQueryChanged,
  epicFilterChanged,
  epicColumnFilterChanged,
  filtersResetForBoard,
  duplicatesToggled,
  unassignedToggled,
  noEpicToggled,
  noSizeToggled,
  ticketsModalToggled,
  emptyMeatballToggled,
  emptyMeatballClosed,
  mainMeatballToggled,
  mainMeatballClosed,
  cardToggleSelected,
  allCardsInColumnSelected,
  selectionCleared,
  contextMenuOpened,
  contextMenuClosed,
  epicDropdownToggled,
  epicDropdownClosed,
  epicStoriesOpened,
  epicStoriesClosed,
  addCardOpened,
  addCardClosed,
  addCardModalUpdated,
  bulkLabelModalOpened,
  bulkLabelModalClosed,
  bulkLabelModalUpdated,
  bulkArchiveModalOpened,
  bulkArchiveModalClosed,
  bulkArchiveModalUpdated,
  bulkMemberModalOpened,
  bulkMemberModalClosed,
  bulkMemberModalUpdated,
  bulkEpicDropdownToggled,
  bulkEpicDropdownClosed,
  bulkEpicSearchChanged,
  bulkMemberDropdownToggled,
  bulkMemberDropdownClosed,
  genModalOpened,
  genModalClosed,
  escapePressed,
  selectDuplicateNames,
  selectEpicColumns
} from '../kanbanSlice'
import type {
  KanbanCard,
  KanbanColumn,
  TrelloLabel,
  TrelloMember
} from '../../../trello/trello.types'
import { api } from '../../api/useApi'
import type { ContextMenuState } from '../kanban.types'
import type { EpicCardOption, EpicStory } from '../../../lib/board.types'
import type { GamificationStats } from '../../analytics/analytics.types'
import type {
  TemplateGroup,
  TicketTemplate,
  GenerateCardsResult
} from '../../templates/template.types'

const initialState = () => reducer(undefined, { type: '@@INIT' })

const makeMember = (overrides: Partial<TrelloMember> = {}): TrelloMember => ({
  id: 'm-1',
  fullName: 'Test Member',
  username: 'test',
  ...overrides
})

const makeLabel = (overrides: Partial<TrelloLabel> = {}): TrelloLabel => ({
  id: 'l-1',
  name: 'Label',
  color: 'green',
  idBoard: 'b-1',
  ...overrides
})

const makeCard = (overrides: Partial<KanbanCard> = {}): KanbanCard => ({
  id: 'c-1',
  name: 'Card',
  desc: '',
  listId: 'list-1',
  pos: 1,
  shortUrl: 'https://trello.test/c-1',
  labels: [],
  members: [],
  dateLastActivity: '2024-01-01T00:00:00Z',
  epicCardId: null,
  epicCardName: null,
  enteredAt: null,
  ...overrides
})

const makeColumn = (overrides: Partial<KanbanColumn> = {}): KanbanColumn => ({
  id: 'list-1',
  name: 'To Do',
  pos: 1,
  cards: [],
  ...overrides
})

const makeEpicOption = (overrides: Partial<EpicCardOption> = {}): EpicCardOption => ({
  id: 'e-1',
  name: 'Epic',
  listId: 'elist-1',
  listName: 'Epics',
  ...overrides
})

const makeEpicStory = (overrides: Partial<EpicStory> = {}): EpicStory => ({
  id: 's-1',
  name: 'Story',
  desc: '',
  listId: 'slist-1',
  listName: 'Stories',
  boardName: 'Story Board',
  pos: 1,
  shortUrl: 'https://trello.test/s-1',
  labelsJson: '[]',
  membersJson: '[]',
  ...overrides
})

const makeGamificationStats = (overrides: Partial<GamificationStats> = {}): GamificationStats => ({
  currentWeekPoints: 10,
  prevWeekPoints: 5,
  yearlyHighScore: 20,
  currentWeek: '2024-W01',
  prevWeek: '2023-W52',
  ...overrides
})

const makeTemplateGroup = (overrides: Partial<TemplateGroup> = {}): TemplateGroup => ({
  id: 1,
  boardId: 'b-1',
  name: 'Group',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
})

const makeTicketTemplate = (overrides: Partial<TicketTemplate> = {}): TicketTemplate => ({
  id: 1,
  boardId: 'b-1',
  groupId: 1,
  name: 'Template',
  titleTemplate: 'Title {{week}}',
  descTemplate: '',
  listId: 'list-1',
  listName: 'To Do',
  labelIds: [],
  epicCardId: null,
  position: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides
})

const makeGenerateCardsResult = (
  overrides: Partial<GenerateCardsResult> = {}
): GenerateCardsResult => ({
  created: 3,
  failed: 0,
  errors: [],
  ...overrides
})

describe('kanbanSlice', () => {
  describe('initial state', () => {
    it('has expected defaults', () => {
      const state = initialState()
      expect(state.columns).toEqual([])
      expect(state.boardMembers).toEqual([])
      expect(state.boardLabels).toEqual([])
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
      expect(state.toastMessage).toBeNull()

      expect(state.searchQuery).toBe('')
      expect(state.epicFilter).toBe('')
      expect(state.epicColumnFilter).toBe('')
      expect(state.showDuplicates).toBe(false)
      expect(state.filterUnassigned).toBe(false)
      expect(state.filterNoEpic).toBe(false)
      expect(state.filterNoSize).toBe(false)

      expect(state.showTicketsModal).toBe(false)
      expect(state.showEmptyMeatball).toBe(false)
      expect(state.showMainMeatball).toBe(false)

      expect(state.selectedCardIds).toEqual([])
      expect(state.contextMenu).toBeNull()

      expect(state.epicCardOptions).toEqual([])
      expect(state.epicDropdownCardId).toBeNull()
      expect(state.epicStoriesCard).toBeNull()
      expect(state.epicStories).toBeNull()
      expect(state.epicStoriesLoading).toBe(false)

      expect(state.gamificationStats).toBeNull()

      expect(state.addCardModal).toBeNull()
      expect(state.bulkLabelModal).toBeNull()
      expect(state.bulkArchiveModal).toBeNull()
      expect(state.bulkMemberModal).toBeNull()

      expect(state.bulkEpicDropdownOpen).toBe(false)
      expect(state.bulkEpicSearch).toBe('')
      expect(state.bulkMemberDropdownOpen).toBe(false)

      expect(state.showGenModal).toBe(false)
      expect(state.genGroups).toEqual([])
      expect(state.genGroupId).toBeNull()
      expect(state.genTemplates).toEqual([])
      expect(state.genLoading).toBe(false)
      expect(state.genGenerating).toBe(false)
      expect(state.genResult).toBeNull()
      expect(state.genError).toBeNull()
    })
  })

  describe('reducers', () => {
    describe('column updates', () => {
      it('columnsUpdated replaces columns', () => {
        const cols = [makeColumn({ id: 'a' }), makeColumn({ id: 'b' })]
        const state = reducer(initialState(), columnsUpdated(cols))
        expect(state.columns).toEqual(cols)
      })

      it('cardRemovedFromColumn removes card from all columns and selection', () => {
        const cardA = makeCard({ id: 'c-a' })
        const cardB = makeCard({ id: 'c-b' })
        const state0 = {
          ...initialState(),
          columns: [
            makeColumn({ id: 'list-1', cards: [cardA, cardB] }),
            makeColumn({ id: 'list-2', cards: [makeCard({ id: 'c-a' })] })
          ],
          selectedCardIds: ['c-a', 'c-x']
        }

        const state = reducer(state0, cardRemovedFromColumn('c-a'))

        expect(state.columns[0]?.cards.map((c) => c.id)).toEqual(['c-b'])
        expect(state.columns[1]?.cards.map((c) => c.id)).toEqual([])
        expect(state.selectedCardIds).toEqual(['c-x'])
      })

      it('cardsAddedToColumn appends cards to matching column', () => {
        const state0 = {
          ...initialState(),
          columns: [makeColumn({ id: 'list-1', cards: [makeCard({ id: 'c-1' })] })]
        }

        const newCards = [makeCard({ id: 'c-2' }), makeCard({ id: 'c-3' })]
        const state = reducer(state0, cardsAddedToColumn({ listId: 'list-1', cards: newCards }))

        expect(state.columns[0]?.cards.map((c) => c.id)).toEqual(['c-1', 'c-2', 'c-3'])
      })

      it('cardsAddedToColumn is a no-op when column not found', () => {
        const state0 = { ...initialState(), columns: [makeColumn({ id: 'list-1' })] }
        const state = reducer(
          state0,
          cardsAddedToColumn({ listId: 'missing', cards: [makeCard({ id: 'c-2' })] })
        )
        expect(state.columns).toEqual(state0.columns)
      })

      it('cardMembersUpdated updates the first matching card members', () => {
        const state0 = {
          ...initialState(),
          columns: [
            makeColumn({
              id: 'list-1',
              cards: [makeCard({ id: 'c-1', members: [] }), makeCard({ id: 'c-2' })]
            })
          ]
        }

        const members = [makeMember({ id: 'm-1' }), makeMember({ id: 'm-2', username: 'two' })]
        const state = reducer(state0, cardMembersUpdated({ cardId: 'c-1', members }))
        expect(state.columns[0]?.cards[0]?.members).toEqual(members)
      })

      it('cardLabelsUpdated updates the first matching card labels', () => {
        const state0 = {
          ...initialState(),
          columns: [makeColumn({ id: 'list-1', cards: [makeCard({ id: 'c-1', labels: [] })] })]
        }
        const labels = [makeLabel({ id: 'l-1' }), makeLabel({ id: 'l-2', color: 'red' })]
        const state = reducer(state0, cardLabelsUpdated({ cardId: 'c-1', labels }))
        expect(state.columns[0]?.cards[0]?.labels).toEqual(labels)
      })

      it('cardEpicUpdated updates the first matching card epic fields', () => {
        const state0 = {
          ...initialState(),
          columns: [
            makeColumn({
              id: 'list-1',
              cards: [makeCard({ id: 'c-1', epicCardId: null, epicCardName: null })]
            })
          ]
        }
        const state = reducer(
          state0,
          cardEpicUpdated({ cardId: 'c-1', epicCardId: 'e-9', epicCardName: 'Epic 9' })
        )
        expect(state.columns[0]?.cards[0]?.epicCardId).toBe('e-9')
        expect(state.columns[0]?.cards[0]?.epicCardName).toBe('Epic 9')
      })

      it('bulkCardEpicUpdated updates all matching cards', () => {
        const state0 = {
          ...initialState(),
          columns: [
            makeColumn({
              id: 'list-1',
              cards: [
                makeCard({ id: 'c-1', epicCardId: null }),
                makeCard({ id: 'c-2', epicCardId: null }),
                makeCard({ id: 'c-3', epicCardId: null })
              ]
            })
          ]
        }

        const state = reducer(
          state0,
          bulkCardEpicUpdated({
            cardIds: ['c-1', 'c-3'],
            epicCardId: 'e-1',
            epicCardName: 'Epic 1'
          })
        )
        expect(state.columns[0]?.cards.map((c) => ({ id: c.id, epic: c.epicCardId }))).toEqual([
          { id: 'c-1', epic: 'e-1' },
          { id: 'c-2', epic: null },
          { id: 'c-3', epic: 'e-1' }
        ])
      })
    })

    describe('toast', () => {
      it('kanbanToastShown sets toastMessage', () => {
        const state = reducer(initialState(), kanbanToastShown('Saved.'))
        expect(state.toastMessage).toBe('Saved.')
      })

      it('kanbanToastDismissed clears toastMessage', () => {
        const state0 = reducer(initialState(), kanbanToastShown('Saved.'))
        const state = reducer(state0, kanbanToastDismissed())
        expect(state.toastMessage).toBeNull()
      })
    })

    describe('filters', () => {
      it('searchQueryChanged sets searchQuery', () => {
        const state = reducer(initialState(), searchQueryChanged('abc'))
        expect(state.searchQuery).toBe('abc')
      })

      it('epicFilterChanged sets epicFilter and clears epicColumnFilter', () => {
        const state0 = { ...initialState(), epicColumnFilter: 'col-1' }
        const state = reducer(state0, epicFilterChanged('epic'))
        expect(state.epicFilter).toBe('epic')
        expect(state.epicColumnFilter).toBe('')
      })

      it('epicColumnFilterChanged sets epicColumnFilter and clears epicFilter', () => {
        const state0 = { ...initialState(), epicFilter: 'epic' }
        const state = reducer(state0, epicColumnFilterChanged('col-1'))
        expect(state.epicColumnFilter).toBe('col-1')
        expect(state.epicFilter).toBe('')
      })

      it('filtersResetForBoard clears all filters', () => {
        const state0 = {
          ...initialState(),
          searchQuery: 'x',
          epicFilter: 'e',
          epicColumnFilter: 'c',
          showDuplicates: true,
          filterUnassigned: true,
          filterNoEpic: true,
          filterNoSize: true
        }
        const state = reducer(state0, filtersResetForBoard())
        expect(state.searchQuery).toBe('')
        expect(state.epicFilter).toBe('')
        expect(state.epicColumnFilter).toBe('')
        expect(state.showDuplicates).toBe(false)
        expect(state.filterUnassigned).toBe(false)
        expect(state.filterNoEpic).toBe(false)
        expect(state.filterNoSize).toBe(false)
      })

      it('duplicatesToggled toggles showDuplicates and closes main meatball', () => {
        const state0 = { ...initialState(), showMainMeatball: true }
        const state = reducer(state0, duplicatesToggled())
        expect(state.showDuplicates).toBe(true)
        expect(state.showMainMeatball).toBe(false)
      })

      it('unassignedToggled toggles filterUnassigned and closes main meatball', () => {
        const state0 = { ...initialState(), showMainMeatball: true }
        const state = reducer(state0, unassignedToggled())
        expect(state.filterUnassigned).toBe(true)
        expect(state.showMainMeatball).toBe(false)
      })

      it('noEpicToggled toggles filterNoEpic and closes main meatball', () => {
        const state0 = { ...initialState(), showMainMeatball: true }
        const state = reducer(state0, noEpicToggled())
        expect(state.filterNoEpic).toBe(true)
        expect(state.showMainMeatball).toBe(false)
      })

      it('noSizeToggled toggles filterNoSize and closes main meatball', () => {
        const state0 = { ...initialState(), showMainMeatball: true }
        const state = reducer(state0, noSizeToggled())
        expect(state.filterNoSize).toBe(true)
        expect(state.showMainMeatball).toBe(false)
      })
    })

    describe('toolbar modals', () => {
      it('ticketsModalToggled sets showTicketsModal', () => {
        let state = reducer(initialState(), ticketsModalToggled(true))
        expect(state.showTicketsModal).toBe(true)
        state = reducer(state, ticketsModalToggled(false))
        expect(state.showTicketsModal).toBe(false)
      })

      it('emptyMeatballToggled toggles showEmptyMeatball', () => {
        let state = reducer(initialState(), emptyMeatballToggled())
        expect(state.showEmptyMeatball).toBe(true)
        state = reducer(state, emptyMeatballToggled())
        expect(state.showEmptyMeatball).toBe(false)
      })

      it('emptyMeatballClosed sets showEmptyMeatball false', () => {
        const state0 = reducer(initialState(), emptyMeatballToggled())
        const state = reducer(state0, emptyMeatballClosed())
        expect(state.showEmptyMeatball).toBe(false)
      })

      it('mainMeatballToggled toggles showMainMeatball', () => {
        let state = reducer(initialState(), mainMeatballToggled())
        expect(state.showMainMeatball).toBe(true)
        state = reducer(state, mainMeatballToggled())
        expect(state.showMainMeatball).toBe(false)
      })

      it('mainMeatballClosed sets showMainMeatball false', () => {
        const state0 = reducer(initialState(), mainMeatballToggled())
        const state = reducer(state0, mainMeatballClosed())
        expect(state.showMainMeatball).toBe(false)
      })
    })

    describe('selection', () => {
      it('cardToggleSelected adds/removes from selectedCardIds', () => {
        let state = reducer(initialState(), cardToggleSelected('c-1'))
        expect(state.selectedCardIds).toEqual(['c-1'])
        state = reducer(state, cardToggleSelected('c-1'))
        expect(state.selectedCardIds).toEqual([])
      })

      it('allCardsInColumnSelected unions ids', () => {
        const state0 = { ...initialState(), selectedCardIds: ['c-1'] }
        const state = reducer(state0, allCardsInColumnSelected(['c-1', 'c-2', 'c-3']))
        expect([...state.selectedCardIds].sort()).toEqual(['c-1', 'c-2', 'c-3'])
      })

      it('selectionCleared resets selectedCardIds', () => {
        const state0 = { ...initialState(), selectedCardIds: ['c-1'] }
        const state = reducer(state0, selectionCleared())
        expect(state.selectedCardIds).toEqual([])
      })
    })

    describe('context menu', () => {
      it('contextMenuOpened sets contextMenu', () => {
        const ctx: ContextMenuState = { x: 10, y: 20, card: makeCard({ id: 'c-1' }) }
        const state = reducer(initialState(), contextMenuOpened(ctx))
        expect(state.contextMenu).toEqual(ctx)
      })

      it('contextMenuClosed clears contextMenu', () => {
        const ctx: ContextMenuState = { x: 10, y: 20, card: makeCard({ id: 'c-1' }) }
        const state0 = reducer(initialState(), contextMenuOpened(ctx))
        const state = reducer(state0, contextMenuClosed())
        expect(state.contextMenu).toBeNull()
      })
    })

    describe('epic management', () => {
      it('epicDropdownToggled opens/closes for a given card', () => {
        let state = reducer(initialState(), epicDropdownToggled('c-1'))
        expect(state.epicDropdownCardId).toBe('c-1')
        state = reducer(state, epicDropdownToggled('c-1'))
        expect(state.epicDropdownCardId).toBeNull()
      })

      it('epicDropdownClosed clears epicDropdownCardId', () => {
        const state0 = reducer(initialState(), epicDropdownToggled('c-1'))
        const state = reducer(state0, epicDropdownClosed())
        expect(state.epicDropdownCardId).toBeNull()
      })

      it('epicStoriesOpened sets epicStoriesCard, clears epicStories, and sets loading', () => {
        const state0 = { ...initialState(), epicStories: [makeEpicStory()] }
        const state = reducer(state0, epicStoriesOpened({ id: 'e-1', name: 'Epic 1' }))
        expect(state.epicStoriesCard).toEqual({ id: 'e-1', name: 'Epic 1' })
        expect(state.epicStories).toBeNull()
        expect(state.epicStoriesLoading).toBe(true)
      })

      it('epicStoriesClosed clears epicStoriesCard and epicStories', () => {
        const state0 = {
          ...initialState(),
          epicStoriesCard: { id: 'e-1', name: 'Epic 1' },
          epicStories: [makeEpicStory()],
          epicStoriesLoading: true
        }
        const state = reducer(state0, epicStoriesClosed())
        expect(state.epicStoriesCard).toBeNull()
        expect(state.epicStories).toBeNull()
        expect(state.epicStoriesLoading).toBe(true)
      })
    })

    describe('add card modal', () => {
      it('addCardOpened initializes addCardModal', () => {
        const state = reducer(
          initialState(),
          addCardOpened({ listId: 'list-1', listName: 'To Do' })
        )
        expect(state.addCardModal).toEqual({
          listId: 'list-1',
          listName: 'To Do',
          text: '',
          queue: null,
          uploading: false
        })
      })

      it('addCardClosed closes addCardModal when not uploading', () => {
        const state0 = reducer(
          initialState(),
          addCardOpened({ listId: 'list-1', listName: 'To Do' })
        )
        const state = reducer(state0, addCardClosed())
        expect(state.addCardModal).toBeNull()
      })

      it('addCardClosed does not close addCardModal when uploading', () => {
        const state0 = {
          ...initialState(),
          addCardModal: {
            listId: 'list-1',
            listName: 'To Do',
            text: 'x',
            queue: [],
            uploading: true
          }
        }
        const state = reducer(state0, addCardClosed())
        expect(state.addCardModal).toEqual(state0.addCardModal)
      })

      it('addCardModalUpdated replaces addCardModal', () => {
        const updated = {
          listId: 'list-1',
          listName: 'To Do',
          text: 'x',
          queue: null,
          uploading: false
        }
        const state = reducer(initialState(), addCardModalUpdated(updated))
        expect(state.addCardModal).toEqual(updated)
      })
    })

    describe('bulk label modal', () => {
      it('bulkLabelModalOpened sets bulkLabelModal', () => {
        const modal = {
          selectedLabelIds: ['l-1'],
          text: 'x',
          queue: null,
          uploading: false,
          fromSelection: true
        }
        const state = reducer(initialState(), bulkLabelModalOpened(modal))
        expect(state.bulkLabelModal).toEqual(modal)
      })

      it('bulkLabelModalClosed closes when not uploading', () => {
        const modal = {
          selectedLabelIds: ['l-1'],
          text: 'x',
          queue: null,
          uploading: false
        }
        const state0 = reducer(initialState(), bulkLabelModalOpened(modal))
        const state = reducer(state0, bulkLabelModalClosed())
        expect(state.bulkLabelModal).toBeNull()
      })

      it('bulkLabelModalClosed does not close when uploading', () => {
        const state0 = {
          ...initialState(),
          bulkLabelModal: {
            selectedLabelIds: ['l-1'],
            text: 'x',
            queue: [],
            uploading: true
          }
        }
        const state = reducer(state0, bulkLabelModalClosed())
        expect(state.bulkLabelModal).toEqual(state0.bulkLabelModal)
      })

      it('bulkLabelModalUpdated replaces bulkLabelModal', () => {
        const modal = {
          selectedLabelIds: ['l-1', 'l-2'],
          text: 'y',
          queue: null,
          uploading: false
        }
        const state = reducer(initialState(), bulkLabelModalUpdated(modal))
        expect(state.bulkLabelModal).toEqual(modal)
      })
    })

    describe('bulk archive modal', () => {
      it('bulkArchiveModalOpened creates modal when there is a selection', () => {
        const state0 = { ...initialState(), selectedCardIds: ['c-1'] }
        const state = reducer(state0, bulkArchiveModalOpened())
        expect(state.bulkArchiveModal).toEqual({ queue: null, running: false })
      })

      it('bulkArchiveModalOpened is a no-op when there is no selection', () => {
        const state0 = { ...initialState(), selectedCardIds: [] }
        const state = reducer(state0, bulkArchiveModalOpened())
        expect(state.bulkArchiveModal).toBeNull()
      })

      it('bulkArchiveModalClosed closes when not running', () => {
        const state0 = { ...initialState(), bulkArchiveModal: { queue: null, running: false } }
        const state = reducer(state0, bulkArchiveModalClosed())
        expect(state.bulkArchiveModal).toBeNull()
      })

      it('bulkArchiveModalClosed does not close when running', () => {
        const state0 = { ...initialState(), bulkArchiveModal: { queue: [], running: true } }
        const state = reducer(state0, bulkArchiveModalClosed())
        expect(state.bulkArchiveModal).toEqual(state0.bulkArchiveModal)
      })

      it('bulkArchiveModalUpdated replaces bulkArchiveModal', () => {
        const modal = { queue: [], running: true }
        const state = reducer(initialState(), bulkArchiveModalUpdated(modal))
        expect(state.bulkArchiveModal).toEqual(modal)
      })
    })

    describe('bulk member modal', () => {
      it('bulkMemberModalOpened creates modal and closes dropdown when there is a selection', () => {
        const state0 = {
          ...initialState(),
          selectedCardIds: ['c-1'],
          bulkMemberDropdownOpen: true
        }
        const state = reducer(
          state0,
          bulkMemberModalOpened({ memberId: 'm-1', memberName: 'Member', assign: true })
        )
        expect(state.bulkMemberDropdownOpen).toBe(false)
        expect(state.bulkMemberModal).toEqual({
          memberId: 'm-1',
          memberName: 'Member',
          assign: true,
          queue: null,
          running: false
        })
      })

      it('bulkMemberModalOpened is a no-op when there is no selection', () => {
        const state0 = { ...initialState(), selectedCardIds: [] }
        const state = reducer(
          state0,
          bulkMemberModalOpened({ memberId: 'm-1', memberName: 'Member', assign: true })
        )
        expect(state.bulkMemberModal).toBeNull()
      })

      it('bulkMemberModalClosed closes when not running', () => {
        const state0 = {
          ...initialState(),
          bulkMemberModal: {
            memberId: 'm-1',
            memberName: 'Member',
            assign: true,
            queue: null,
            running: false
          }
        }
        const state = reducer(state0, bulkMemberModalClosed())
        expect(state.bulkMemberModal).toBeNull()
      })

      it('bulkMemberModalClosed does not close when running', () => {
        const state0 = {
          ...initialState(),
          bulkMemberModal: {
            memberId: 'm-1',
            memberName: 'Member',
            assign: true,
            queue: [],
            running: true
          }
        }
        const state = reducer(state0, bulkMemberModalClosed())
        expect(state.bulkMemberModal).toEqual(state0.bulkMemberModal)
      })

      it('bulkMemberModalUpdated replaces bulkMemberModal', () => {
        const modal = {
          memberId: 'm-1',
          memberName: 'Member',
          assign: false,
          queue: [],
          running: true
        }
        const state = reducer(initialState(), bulkMemberModalUpdated(modal))
        expect(state.bulkMemberModal).toEqual(modal)
      })
    })

    describe('bulk epic dropdown', () => {
      it('bulkEpicDropdownToggled toggles open state', () => {
        let state = reducer(initialState(), bulkEpicDropdownToggled())
        expect(state.bulkEpicDropdownOpen).toBe(true)
        state = reducer(state, bulkEpicDropdownToggled())
        expect(state.bulkEpicDropdownOpen).toBe(false)
      })

      it('bulkEpicDropdownClosed closes and clears search', () => {
        const state0 = { ...initialState(), bulkEpicDropdownOpen: true, bulkEpicSearch: 'abc' }
        const state = reducer(state0, bulkEpicDropdownClosed())
        expect(state.bulkEpicDropdownOpen).toBe(false)
        expect(state.bulkEpicSearch).toBe('')
      })

      it('bulkEpicSearchChanged sets search text', () => {
        const state = reducer(initialState(), bulkEpicSearchChanged('abc'))
        expect(state.bulkEpicSearch).toBe('abc')
      })
    })

    describe('bulk member dropdown', () => {
      it('bulkMemberDropdownToggled toggles open state', () => {
        let state = reducer(initialState(), bulkMemberDropdownToggled())
        expect(state.bulkMemberDropdownOpen).toBe(true)
        state = reducer(state, bulkMemberDropdownToggled())
        expect(state.bulkMemberDropdownOpen).toBe(false)
      })

      it('bulkMemberDropdownClosed closes dropdown', () => {
        const state0 = { ...initialState(), bulkMemberDropdownOpen: true }
        const state = reducer(state0, bulkMemberDropdownClosed())
        expect(state.bulkMemberDropdownOpen).toBe(false)
      })
    })

    describe('generate template modal', () => {
      it('genModalOpened opens modal and clears selection fields', () => {
        const state0 = {
          ...initialState(),
          showGenModal: false,
          genGroupId: 10,
          genTemplates: [makeTicketTemplate()],
          genResult: makeGenerateCardsResult(),
          genError: 'old'
        }
        const state = reducer(state0, genModalOpened())
        expect(state.showGenModal).toBe(true)
        expect(state.genGroupId).toBeNull()
        expect(state.genTemplates).toEqual([])
        expect(state.genResult).toBeNull()
        expect(state.genError).toBeNull()
      })

      it('genModalClosed closes modal', () => {
        const state0 = reducer(initialState(), genModalOpened())
        const state = reducer(state0, genModalClosed())
        expect(state.showGenModal).toBe(false)
      })
    })

    describe('escape key handler', () => {
      it('escapePressed closes transient UI and clears selection', () => {
        const state0 = {
          ...initialState(),
          showTicketsModal: true,
          epicStoriesCard: { id: 'e-1', name: 'Epic 1' },
          epicStories: [makeEpicStory()],
          epicDropdownCardId: 'c-1',
          showGenModal: true,
          bulkEpicDropdownOpen: true,
          bulkEpicSearch: 'abc',
          selectedCardIds: ['c-1', 'c-2'],
          showEmptyMeatball: true,
          showMainMeatball: true,
          addCardModal: {
            listId: 'list-1',
            listName: 'To Do',
            text: 'x',
            queue: null,
            uploading: false
          },
          bulkArchiveModal: { queue: null, running: false },
          bulkMemberModal: {
            memberId: 'm-1',
            memberName: 'Member',
            assign: true,
            queue: null,
            running: false
          }
        }

        const state = reducer(state0, escapePressed())

        expect(state.showTicketsModal).toBe(false)
        expect(state.epicStoriesCard).toBeNull()
        expect(state.epicStories).toBeNull()
        expect(state.epicDropdownCardId).toBeNull()
        expect(state.showGenModal).toBe(false)
        expect(state.bulkEpicDropdownOpen).toBe(false)
        expect(state.bulkEpicSearch).toBe('')
        expect(state.selectedCardIds).toEqual([])
        expect(state.showEmptyMeatball).toBe(false)
        expect(state.showMainMeatball).toBe(false)
        expect(state.addCardModal).toBeNull()
        expect(state.bulkArchiveModal).toBeNull()
        expect(state.bulkMemberModal).toBeNull()
      })

      it('escapePressed does not close uploading/running modals', () => {
        const state0 = {
          ...initialState(),
          addCardModal: {
            listId: 'list-1',
            listName: 'To Do',
            text: 'x',
            queue: [],
            uploading: true
          },
          bulkArchiveModal: { queue: [], running: true },
          bulkMemberModal: {
            memberId: 'm-1',
            memberName: 'Member',
            assign: true,
            queue: [],
            running: true
          }
        }

        const state = reducer(state0, escapePressed())

        expect(state.addCardModal).toEqual(state0.addCardModal)
        expect(state.bulkArchiveModal).toEqual(state0.bulkArchiveModal)
        expect(state.bulkMemberModal).toEqual(state0.bulkMemberModal)
      })
    })
  })

  describe('extraReducers', () => {
    it('fetchBoardData.pending sets loading true, clears error, and clears selection', () => {
      const state0 = { ...initialState(), loading: false, error: 'x', selectedCardIds: ['c-1'] }
      const state = reducer(state0, { type: 'kanban/fetchBoardData/pending' })
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
      expect(state.selectedCardIds).toEqual([])
    })

    it('fetchBoardData.fulfilled stores columns/members/labels and stops loading', () => {
      const payload = {
        columns: [makeColumn({ id: 'list-1', cards: [makeCard({ id: 'c-1' })] })],
        members: [makeMember({ id: 'm-1' })],
        labels: [makeLabel({ id: 'l-1' })],
        error: null as string | null
      }
      const state0 = { ...initialState(), loading: true }
      const state = reducer(state0, { type: 'kanban/fetchBoardData/fulfilled', payload })
      expect(state.columns).toEqual(payload.columns)
      expect(state.boardMembers).toEqual(payload.members)
      expect(state.boardLabels).toEqual(payload.labels)
      expect(state.error).toBeNull()
      expect(state.loading).toBe(false)
    })

    it('fetchBoardData.rejected sets error message and stops loading', () => {
      const state0 = { ...initialState(), loading: true }
      const state = reducer(state0, {
        type: 'kanban/fetchBoardData/rejected',
        error: { message: 'Nope' }
      })
      expect(state.error).toBe('Nope')
      expect(state.loading).toBe(false)
    })

    it('fetchEpicCards.fulfilled stores epicCardOptions', () => {
      const options = [makeEpicOption({ id: 'e-1', listId: 'l-1', listName: 'Epics' })]
      const state = reducer(initialState(), {
        type: 'kanban/fetchEpicCards/fulfilled',
        payload: options
      })
      expect(state.epicCardOptions).toEqual(options)
    })

    it('fetchEpicStories.pending sets epicStoriesLoading true', () => {
      const state0 = { ...initialState(), epicStoriesLoading: false }
      const state = reducer(state0, { type: 'kanban/fetchEpicStories/pending' })
      expect(state.epicStoriesLoading).toBe(true)
    })

    it('fetchEpicStories.fulfilled stores epicStories and clears loading', () => {
      const stories = [makeEpicStory({ id: 's-1' }), makeEpicStory({ id: 's-2' })]
      const state0 = { ...initialState(), epicStoriesLoading: true }
      const state = reducer(state0, { type: 'kanban/fetchEpicStories/fulfilled', payload: stories })
      expect(state.epicStories).toEqual(stories)
      expect(state.epicStoriesLoading).toBe(false)
    })

    it('fetchEpicStories.rejected clears epicStoriesLoading', () => {
      const state0 = { ...initialState(), epicStoriesLoading: true }
      const state = reducer(state0, { type: 'kanban/fetchEpicStories/rejected' })
      expect(state.epicStoriesLoading).toBe(false)
    })

    it('fetchGamificationStats.fulfilled stores gamificationStats', () => {
      const stats = makeGamificationStats({ currentWeekPoints: 99 })
      const state = reducer(initialState(), {
        type: 'kanban/fetchGamificationStats/fulfilled',
        payload: stats
      })
      expect(state.gamificationStats).toEqual(stats)
    })

    it('fetchGenerateTemplateGroups.fulfilled stores genGroups', () => {
      const groups = [makeTemplateGroup({ id: 1 }), makeTemplateGroup({ id: 2, name: 'G2' })]
      const state = reducer(initialState(), {
        type: 'kanban/fetchGenerateTemplateGroups/fulfilled',
        payload: groups
      })
      expect(state.genGroups).toEqual(groups)
    })

    it('fetchGenerateTemplateGroups.rejected sets genError message', () => {
      const state = reducer(initialState(), {
        type: 'kanban/fetchGenerateTemplateGroups/rejected',
        error: { message: 'Failed.' }
      })
      expect(state.genError).toBe('Failed.')
    })

    it('fetchGenerateTemplates.pending sets loading and clears result/error', () => {
      const state0 = {
        ...initialState(),
        genLoading: false,
        genResult: makeGenerateCardsResult(),
        genError: 'old'
      }
      const state = reducer(state0, { type: 'kanban/fetchGenerateTemplates/pending' })
      expect(state.genLoading).toBe(true)
      expect(state.genResult).toBeNull()
      expect(state.genError).toBeNull()
    })

    it('fetchGenerateTemplates.fulfilled stores genGroupId/templates and clears loading', () => {
      const templates = [makeTicketTemplate({ id: 1 }), makeTicketTemplate({ id: 2, name: 'T2' })]
      const state0 = { ...initialState(), genLoading: true }
      const state = reducer(state0, {
        type: 'kanban/fetchGenerateTemplates/fulfilled',
        payload: { groupId: 5, templates }
      })
      expect(state.genGroupId).toBe(5)
      expect(state.genTemplates).toEqual(templates)
      expect(state.genLoading).toBe(false)
    })

    it('fetchGenerateTemplates.rejected sets error and clears loading', () => {
      const state0 = { ...initialState(), genLoading: true }
      const state = reducer(state0, {
        type: 'kanban/fetchGenerateTemplates/rejected',
        error: { message: 'No templates.' }
      })
      expect(state.genError).toBe('No templates.')
      expect(state.genLoading).toBe(false)
    })

    it('generateCardsFromTemplate.pending sets generating and clears result/error', () => {
      const state0 = {
        ...initialState(),
        genGenerating: false,
        genResult: makeGenerateCardsResult(),
        genError: 'old'
      }
      const state = reducer(state0, { type: 'kanban/generateCardsFromTemplate/pending' })
      expect(state.genGenerating).toBe(true)
      expect(state.genResult).toBeNull()
      expect(state.genError).toBeNull()
    })

    it('generateCardsFromTemplate.fulfilled stores result and clears generating', () => {
      const result = makeGenerateCardsResult({ created: 9 })
      const state0 = { ...initialState(), genGenerating: true }
      const state = reducer(state0, {
        type: 'kanban/generateCardsFromTemplate/fulfilled',
        payload: result
      })
      expect(state.genResult).toEqual(result)
      expect(state.genGenerating).toBe(false)
    })

    it('generateCardsFromTemplate.rejected sets error and clears generating', () => {
      const state0 = { ...initialState(), genGenerating: true }
      const state = reducer(state0, {
        type: 'kanban/generateCardsFromTemplate/rejected',
        error: { message: 'Failed to generate.' }
      })
      expect(state.genError).toBe('Failed to generate.')
      expect(state.genGenerating).toBe(false)
    })
  })

  describe('selectors', () => {
    it('selectDuplicateNames returns a set of lowercased duplicate card names', () => {
      const cols: KanbanColumn[] = [
        makeColumn({
          id: 'list-1',
          cards: [makeCard({ id: 'c-1', name: 'Task' }), makeCard({ id: 'c-2', name: 'Other' })]
        }),
        makeColumn({
          id: 'list-2',
          cards: [
            makeCard({ id: 'c-3', name: '  task  ' }),
            makeCard({ id: 'c-4', name: 'Unique' })
          ]
        })
      ]
      const root = { kanban: { ...initialState(), columns: cols } }
      const dupes = selectDuplicateNames(root)
      expect(dupes).toBeInstanceOf(Set)
      expect(dupes.has('task')).toBe(true)
      expect(dupes.has('other')).toBe(false)
    })

    it('selectEpicColumns returns unique epic columns based on listId (preserves first seen order)', () => {
      const options: EpicCardOption[] = [
        makeEpicOption({ id: 'e-1', listId: 'l-1', listName: 'Epics' }),
        makeEpicOption({ id: 'e-2', listId: 'l-2', listName: 'Roadmap' }),
        makeEpicOption({ id: 'e-3', listId: 'l-1', listName: 'Epics' })
      ]
      const root = { kanban: { ...initialState(), epicCardOptions: options } }
      expect(selectEpicColumns(root)).toEqual([
        { listId: 'l-1', listName: 'Epics' },
        { listId: 'l-2', listName: 'Roadmap' }
      ])
    })
  })
})

// ── Thunk dispatch tests ───────────────────────────────────────────────────────

const makeStore = () => configureStore({ reducer: { kanban: reducer } })

describe('async thunks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchBoardData', () => {
    it('fulfilled sets columns, members, labels when all calls succeed', async () => {
      const column = makeColumn({ id: 'c1' })
      const member = makeMember({ id: 'm1' })
      ;(api.trello.getBoardData as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [column]
      })
      ;(api.trello.getBoardMembers as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [member]
      })
      ;(api.trello.getBoardLabels as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: []
      })
      const store = makeStore()
      await store.dispatch(fetchBoardData('board-1'))
      const state = store.getState().kanban
      expect(state.columns).toHaveLength(1)
      expect(state.boardMembers).toHaveLength(1)
      expect(state.loading).toBe(false)
    })

    it('stores error message when getBoardData fails', async () => {
      ;(api.trello.getBoardData as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Network error'
      })
      ;(api.trello.getBoardMembers as jest.Mock).mockResolvedValueOnce({ success: true, data: [] })
      ;(api.trello.getBoardLabels as jest.Mock).mockResolvedValueOnce({ success: true, data: [] })
      const store = makeStore()
      await store.dispatch(fetchBoardData('board-1'))
      const state = store.getState().kanban
      expect(state.error).toBe('Network error')
    })

    it('falls back to empty arrays when API calls return no data', async () => {
      ;(api.trello.getBoardData as jest.Mock).mockResolvedValueOnce({ success: false })
      ;(api.trello.getBoardMembers as jest.Mock).mockResolvedValueOnce({ success: false })
      ;(api.trello.getBoardLabels as jest.Mock).mockResolvedValueOnce({ success: false })
      const store = makeStore()
      await store.dispatch(fetchBoardData('board-1'))
      const state = store.getState().kanban
      expect(state.columns).toEqual([])
      expect(state.boardMembers).toEqual([])
      expect(state.boardLabels).toEqual([])
    })
  })

  describe('fetchEpicCards', () => {
    it('fulfilled sets epicCardOptions', async () => {
      const epicOption: EpicCardOption = {
        id: 'e1',
        name: 'Epic 1',
        listId: 'l1',
        listName: 'Epics'
      }
      ;(api.epics.getCards as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [epicOption]
      })
      const store = makeStore()
      await store.dispatch(fetchEpicCards('board-1'))
      expect(store.getState().kanban.epicCardOptions).toHaveLength(1)
    })

    it('falls back to empty array when getCards fails', async () => {
      ;(api.epics.getCards as jest.Mock).mockResolvedValueOnce({ success: false })
      const store = makeStore()
      await store.dispatch(fetchEpicCards('board-1'))
      expect(store.getState().kanban.epicCardOptions).toEqual([])
    })
  })

  describe('fetchEpicStories', () => {
    it('fulfilled sets epicStories', async () => {
      const story: EpicStory = makeEpicStory({ id: 's-1' })
      ;(api.epics.getStories as jest.Mock).mockResolvedValueOnce({ success: true, data: [story] })
      const store = makeStore()
      await store.dispatch(fetchEpicStories('epic-card-1'))
      expect(store.getState().kanban.epicStories).toHaveLength(1)
    })

    it('falls back to empty array when getStories fails', async () => {
      ;(api.epics.getStories as jest.Mock).mockResolvedValueOnce({ success: false })
      const store = makeStore()
      await store.dispatch(fetchEpicStories('epic-card-1'))
      expect(store.getState().kanban.epicStories).toEqual([])
    })
  })

  describe('fetchGamificationStats', () => {
    it('fulfilled sets gamificationStats', async () => {
      const stats: GamificationStats = makeGamificationStats()
      ;(api.analytics.gamificationStats as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: stats
      })
      const store = makeStore()
      await store.dispatch(
        fetchGamificationStats({ boardId: 'b1', myMemberId: 'm1', storyPointsConfig: [] })
      )
      expect(store.getState().kanban.gamificationStats).toEqual(stats)
    })

    it('sets gamificationStats to null when call fails', async () => {
      ;(api.analytics.gamificationStats as jest.Mock).mockResolvedValueOnce({ success: false })
      const store = makeStore()
      await store.dispatch(
        fetchGamificationStats({ boardId: 'b1', myMemberId: 'm1', storyPointsConfig: [] })
      )
      expect(store.getState().kanban.gamificationStats).toBeNull()
    })
  })

  describe('fetchGenerateTemplateGroups', () => {
    it('fulfilled sets genGroups', async () => {
      const group = makeTemplateGroup()
      ;(api.templates.getGroups as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [group]
      })
      const store = makeStore()
      await store.dispatch(fetchGenerateTemplateGroups('board-1'))
      expect(store.getState().kanban.genGroups).toHaveLength(1)
    })

    it('rejected when getGroups fails', async () => {
      ;(api.templates.getGroups as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Groups error'
      })
      const store = makeStore()
      const result = await store.dispatch(fetchGenerateTemplateGroups('board-1'))
      expect(result.type).toBe('kanban/fetchGenerateTemplateGroups/rejected')
    })
  })

  describe('fetchGenerateTemplates', () => {
    it('fulfilled sets genTemplates for the group', async () => {
      const template = makeTicketTemplate()
      ;(api.templates.getTemplates as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: [template]
      })
      const store = makeStore()
      await store.dispatch(fetchGenerateTemplates({ boardId: 'b1', groupId: 1 }))
      expect(store.getState().kanban.genTemplates).toHaveLength(1)
    })

    it('rejected when getTemplates fails', async () => {
      ;(api.templates.getTemplates as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Templates error'
      })
      const store = makeStore()
      const result = await store.dispatch(fetchGenerateTemplates({ boardId: 'b1', groupId: 1 }))
      expect(result.type).toBe('kanban/fetchGenerateTemplates/rejected')
    })
  })

  describe('generateCardsFromTemplate', () => {
    it('fulfilled sets genResult', async () => {
      const genResult: GenerateCardsResult = { created: 3, failed: 0, errors: [] }
      ;(api.templates.generateCards as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: genResult
      })
      const store = makeStore()
      await store.dispatch(generateCardsFromTemplate({ boardId: 'b1', groupId: 1 }))
      expect(store.getState().kanban.genResult).toEqual(genResult)
    })

    it('rejected when generateCards fails', async () => {
      ;(api.templates.generateCards as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Generate failed.'
      })
      const store = makeStore()
      const result = await store.dispatch(generateCardsFromTemplate({ boardId: 'b1', groupId: 1 }))
      expect(result.type).toBe('kanban/generateCardsFromTemplate/rejected')
    })
  })
})
