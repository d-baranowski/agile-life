import { useState, useRef, useEffect, useCallback } from 'react'
import { Draggable } from 'react-beautiful-dnd'
import type { KanbanCard } from '../../../../trello/trello.types'
import type { EpicCardOption } from '../../../../lib/board.types'
import { fuzzyMatch } from '../../../../lib/fuzzy-match'
import { labelColor, labelTextColor } from '../../../../lib/label-colors'
import { formatAge } from '../../../../lib/format-age'
import {
  CardWrapper,
  Checkbox,
  CardHeader,
  CardName,
  CardNameInput,
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
  TimerButton,
  TimerEntriesButton,
  DuplicateBadge
} from './DraggableCard.styled'
import type { CardTimerEntry } from '../../../timers/timer.types'

interface CardProps {
  card: KanbanCard
  index: number
  isStoryBoard: boolean
  isEpicBoard: boolean
  epicCardOptions: EpicCardOption[]
  epicDropdownCardId: string | null
  isDuplicate: boolean
  isSelected: boolean
  activeTimer: CardTimerEntry | null
  totalTimerSeconds: number
  onToggleSelect: (cardId: string) => void
  onOpenEpicStories: (cardId: string, cardName: string) => void
  onSetCardEpic: (cardId: string, epicCardId: string | null) => void
  onToggleEpicDropdown: (cardId: string) => void
  onContextMenu: (e: React.MouseEvent) => void
  onRenameCard: (cardId: string, name: string) => void
  onToggleTimer: (cardId: string) => void
  onOpenTimerEntries: (cardId: string) => void
}

function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const rem = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(rem).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

function formatTotal(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s === 0) return '0m'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  return `${m}m`
}

export default function DraggableCard(props: CardProps): JSX.Element {
  const {
    card,
    index,
    isStoryBoard,
    isEpicBoard,
    epicCardOptions,
    epicDropdownCardId,
    isDuplicate,
    isSelected,
    activeTimer,
    totalTimerSeconds,
    onToggleSelect,
    onOpenEpicStories,
    onSetCardEpic,
    onToggleEpicDropdown,
    onContextMenu,
    onRenameCard,
    onToggleTimer,
    onOpenTimerEntries
  } = props
  const lastClickRef = useRef<number>(0)
  const epicSearchRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLTextAreaElement>(null)
  const [epicSearchQuery, setEpicSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(card.name)
  const [timerNow, setTimerNow] = useState(() => Date.now())

  useEffect(() => {
    if (!activeTimer) return
    setTimerNow(Date.now())
    const id = window.setInterval(() => setTimerNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [activeTimer])

  const timerElapsedSeconds = activeTimer
    ? Math.max(0, Math.floor((timerNow - new Date(activeTimer.startedAt).getTime()) / 1000))
    : 0

  const combinedTotalSeconds = totalTimerSeconds + (activeTimer ? timerElapsedSeconds : 0)
  const totalLabel = formatTotal(combinedTotalSeconds)
  const hasAnyTime = combinedTotalSeconds > 0

  const isDropdownOpen = epicDropdownCardId === card.id

  // Reset search query and focus the input whenever this card's dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setEpicSearchQuery('')
      // Defer focus so the input is mounted before we try to focus it
      requestAnimationFrame(() => epicSearchRef.current?.focus())
    }
  }, [isDropdownOpen])

  // Auto-resize and focus the textarea when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      const el = nameInputRef.current
      el.focus()
      el.selectionStart = el.value.length
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [isEditing])

  const handleStartEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setEditValue(card.name)
      setIsEditing(true)
    },
    [card.name]
  )

  const handleSave = useCallback(() => {
    setIsEditing(false)
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== card.name) {
      onRenameCard(card.id, trimmed)
    }
  }, [card.id, card.name, editValue, onRenameCard])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setEditValue(card.name)
  }, [card.name])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

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
          title={
            isEpicBoard
              ? 'Double-click to see stories in this epic'
              : hasAnyTime
                ? `Total time tracked: ${totalLabel}`
                : undefined
          }
        >
          <CardHeader>
            {isEditing ? (
              <CardNameInput
                ref={nameInputRef}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                rows={1}
              />
            ) : (
              <CardName onClick={handleStartEditing} title="Click to edit title">
                {isDuplicate && <DuplicateBadge title="Duplicate title">⊖</DuplicateBadge>}
                {card.name}
              </CardName>
            )}
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
                <TimerButton
                  $running={!!activeTimer}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleTimer(card.id)
                  }}
                  title={activeTimer ? 'Stop timer' : 'Start timer'}
                >
                  {activeTimer ? `⏸ ${formatElapsed(timerElapsedSeconds)}` : '▶ Timer'}
                </TimerButton>
                <TimerEntriesButton
                  $hasTotal={hasAnyTime}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenTimerEntries(card.id)
                  }}
                  title={
                    hasAnyTime
                      ? `Total tracked: ${totalLabel} — click to view entries`
                      : 'View and edit time entries'
                  }
                >
                  {hasAnyTime ? `⏱ ${totalLabel}` : '⏱'}
                </TimerEntriesButton>
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
