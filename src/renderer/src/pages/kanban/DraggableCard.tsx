import { useState, useRef, useEffect } from 'react'
import { Draggable } from 'react-beautiful-dnd'
import type { KanbanCard, EpicCardOption } from '@shared/trello.types'
import { fuzzyMatch } from '../../lib/fuzzy-match'
import { labelColor, labelTextColor } from '../../lib/label-colors'
import { formatAge } from '../../lib/format-age'
import styles from '../KanbanPage.module.css'

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
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.card} ${snapshot.isDragging ? styles.cardDragging : ''} ${isDuplicate ? styles.cardDuplicate : ''} ${isSelected ? styles.cardSelected : ''}`}
          onClick={handleClick}
          onContextMenu={onContextMenu}
          title={isEpicBoard ? 'Double-click to see stories in this epic' : undefined}
        >
          <div className={styles.cardHeader}>
            <span className={styles.cardName}>
              {isDuplicate && (
                <span className={styles.duplicateBadge} title="Duplicate title">
                  ⊖
                </span>
              )}
              {card.name}
            </span>
            <button
              className={`${styles.cardCheckbox} ${isSelected ? styles.cardCheckboxChecked : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect(card.id)
              }}
              title={isSelected ? 'Deselect card' : 'Select card'}
              aria-label={isSelected ? 'Deselect card' : 'Select card'}
              aria-pressed={isSelected}
            >
              {isSelected ? '✓' : ''}
            </button>
          </div>

          {/* Epic label (story board only) */}
          {isStoryBoard && (
            <div className={styles.epicRow}>
              <button
                className={card.epicCardName ? styles.epicChip : styles.epicChipEmpty}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleEpicDropdown(card.id)
                }}
                title="Assign epic"
              >
                {card.epicCardName ? `⚡ ${card.epicCardName}` : '+ Epic'}
              </button>

              {isDropdownOpen && (
                <div className={styles.epicDropdown} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.epicDropdownSearch}>
                    <input
                      ref={epicSearchRef}
                      type="text"
                      className={styles.epicDropdownSearchInput}
                      placeholder="Search epics…"
                      value={epicSearchQuery}
                      onChange={(e) => setEpicSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    className={styles.epicDropdownItem}
                    onClick={() => onSetCardEpic(card.id, null)}
                  >
                    — None
                  </button>
                  {epicCardOptions
                    .filter(
                      (opt) =>
                        !epicSearchQuery.trim() ||
                        fuzzyMatch(epicSearchQuery, `${opt.name} ${opt.listName}`)
                    )
                    .map((opt) => (
                      <button
                        key={opt.id}
                        className={`${styles.epicDropdownItem} ${card.epicCardId === opt.id ? styles.epicDropdownItemActive : ''}`}
                        onClick={() => onSetCardEpic(card.id, opt.id)}
                      >
                        <span className={styles.epicDropdownName}>{opt.name}</span>
                        <span className={styles.epicDropdownList}>{opt.listName}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Epic board hint */}
          {isEpicBoard && (
            <span className={styles.epicBoardHint}>⚡ Epic — double-click for stories</span>
          )}

          <div className={styles.cardFooter}>
            {card.labels.length > 0 && (
              <div className={styles.labels}>
                {card.labels.map((label) => {
                  const bg = labelColor(label.color)
                  return (
                    <span
                      key={label.id}
                      className={styles.label}
                      style={{ background: bg, color: labelTextColor(bg) }}
                      title={label.name || label.color}
                    >
                      {label.name || label.color}
                    </span>
                  )
                })}
              </div>
            )}

            <div className={styles.cardActions}>
              {card.members.length > 0 && (
                <div className={styles.members}>
                  {card.members.map((member) => (
                    <span key={member.id} className={styles.memberAvatar} title={member.fullName}>
                      {member.fullName.charAt(0).toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.cardMeta}>
                {card.enteredAt && (
                  <span
                    className={styles.columnAge}
                    title={`In this column since ${new Date(card.enteredAt).toLocaleString()}`}
                  >
                    {formatAge(card.enteredAt)}
                  </span>
                )}

                {card.shortUrl && (
                  <a
                    href={card.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.trelloLink}
                    title="Open in Trello"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
