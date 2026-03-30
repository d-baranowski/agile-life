import { useState, useRef, useEffect } from 'react'
import { Draggable } from 'react-beautiful-dnd'
import type { KanbanCard } from '../../trello/trello.types'
import type { EpicCardOption } from '../../lib/board.types'
import { fuzzyMatch } from '../../lib/fuzzy-match'
import { labelColor, labelTextColor } from '../../lib/label-colors'
import { formatAge } from '../../lib/format-age'
import {
  CardWrapper,
  Checkbox,
  CardHeader,
  CardName,
  Labels,
  Label,
  CardMeta,
  EpicRow,
  EpicChip,
  EpicDropdown,
  EpicDropdownItem,
  EpicDropdownName,
  EpicDropdownListName,
  EpicDropdownSearch,
  EpicDropdownSearchInput,
  EpicBoardHint,
  CardFooter,
  Members,
  MemberAvatar,
  CardActions,
  ColumnAge,
  TrelloLink,
  DuplicateBadge
} from './DraggableCard.styled'

interface CardProps {
  card: KanbanCard
  index: number
  isStoryBoard: boolean
  isEpicBoard: boolean
  epicCardOptions: EpicCardOption[]
  epicDropdownCardId: string | null
  isDuplicate: boolean
  isSelected: boolean
  onToggleSelect: (cardId: string) => void
  onOpenEpicStories: (cardId: string, cardName: string) => void
  onSetCardEpic: (cardId: string, epicCardId: string | null) => void
  onToggleEpicDropdown: (cardId: string) => void
  onContextMenu: (e: React.MouseEvent) => void
}

export default function DraggableCard({
  card,
  index,
  isStoryBoard,
  isEpicBoard,
  epicCardOptions,
  epicDropdownCardId,
  isDuplicate,
  isSelected,
  onToggleSelect,
  onOpenEpicStories,
  onSetCardEpic,
  onToggleEpicDropdown,
  onContextMenu
}: CardProps): JSX.Element {
  const lastClickRef = useRef<number>(0)
  const epicSearchRef = useRef<HTMLInputElement>(null)
  const [epicSearchQuery, setEpicSearchQuery] = useState('')

  const isDropdownOpen = epicDropdownCardId === card.id

  // Reset search query and focus the input whenever this card's dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setEpicSearchQuery('')
      // Defer focus so the input is mounted before we try to focus it
      requestAnimationFrame(() => epicSearchRef.current?.focus())
    }
  }, [isDropdownOpen])

  const handleClick = () => {
    if (!isEpicBoard) return
    const now = Date.now()
    if (now - lastClickRef.current < 350) {
      // Double-click detected
      onOpenEpicStories(card.id, card.name)
    }
    lastClickRef.current = now
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <CardWrapper
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          $dragging={snapshot.isDragging}
          $duplicate={isDuplicate}
          $selected={isSelected}
          onClick={handleClick}
          onContextMenu={onContextMenu}
          title={isEpicBoard ? 'Double-click to see stories in this epic' : undefined}
        >
          <CardHeader>
            <CardName>
              {isDuplicate && <DuplicateBadge title="Duplicate title">⊖</DuplicateBadge>}
              {card.name}
            </CardName>
            <Checkbox
              $checked={isSelected}
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect(card.id)
              }}
              title={isSelected ? 'Deselect card' : 'Select card'}
              aria-label={isSelected ? 'Deselect card' : 'Select card'}
              aria-pressed={isSelected}
            >
              {isSelected ? '✓' : ''}
            </Checkbox>
          </CardHeader>

          {/* Epic label (story board only) */}
          {isStoryBoard && (
            <EpicRow>
              <EpicChip
                $empty={!card.epicCardName}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleEpicDropdown(card.id)
                }}
                title="Assign epic"
              >
                {card.epicCardName ? `⚡ ${card.epicCardName}` : '+ Epic'}
              </EpicChip>

              {isDropdownOpen && (
                <EpicDropdown onClick={(e) => e.stopPropagation()}>
                  <EpicDropdownSearch>
                    <EpicDropdownSearchInput
                      ref={epicSearchRef}
                      type="text"
                      placeholder="Search epics…"
                      value={epicSearchQuery}
                      onChange={(e) => setEpicSearchQuery(e.target.value)}
                    />
                  </EpicDropdownSearch>
                  <EpicDropdownItem onClick={() => onSetCardEpic(card.id, null)}>
                    — None
                  </EpicDropdownItem>
                  {epicCardOptions
                    .filter(
                      (opt) =>
                        !epicSearchQuery.trim() ||
                        fuzzyMatch(epicSearchQuery, `${opt.name} ${opt.listName}`)
                    )
                    .map((opt) => (
                      <EpicDropdownItem
                        key={opt.id}
                        $active={card.epicCardId === opt.id}
                        onClick={() => onSetCardEpic(card.id, opt.id)}
                      >
                        <EpicDropdownName>{opt.name}</EpicDropdownName>
                        <EpicDropdownListName>{opt.listName}</EpicDropdownListName>
                      </EpicDropdownItem>
                    ))}
                </EpicDropdown>
              )}
            </EpicRow>
          )}

          {/* Epic board hint */}
          {isEpicBoard && <EpicBoardHint>⚡ Epic — double-click for stories</EpicBoardHint>}

          <CardFooter>
            {card.labels.length > 0 && (
              <Labels>
                {card.labels.map((label) => {
                  const bg = labelColor(label.color)
                  return (
                    <Label
                      key={label.id}
                      style={{ background: bg, color: labelTextColor(bg) }}
                      title={label.name || label.color}
                    >
                      {label.name || label.color}
                    </Label>
                  )
                })}
              </Labels>
            )}

            <CardActions>
              {card.members.length > 0 && (
                <Members>
                  {card.members.map((member) => (
                    <MemberAvatar key={member.id} title={member.fullName}>
                      {member.fullName.charAt(0).toUpperCase()}
                    </MemberAvatar>
                  ))}
                </Members>
              )}

              <CardMeta>
                {card.enteredAt && (
                  <ColumnAge
                    title={`In this column since ${new Date(card.enteredAt).toLocaleString()}`}
                  >
                    {formatAge(card.enteredAt)}
                  </ColumnAge>
                )}

                {card.shortUrl && (
                  <TrelloLink
                    href={card.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Trello"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </TrelloLink>
                )}
              </CardMeta>
            </CardActions>
          </CardFooter>
        </CardWrapper>
      )}
    </Draggable>
  )
}
