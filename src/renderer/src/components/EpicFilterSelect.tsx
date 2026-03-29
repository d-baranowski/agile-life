import { useState, useRef, useEffect } from 'react'
import type { EpicCardOption } from '@shared/board.types'
import { fuzzyMatch } from './EpicSelect'
import styles from './EpicFilterSelect.module.css'
import selectStyles from './EpicSelect.module.css'

const ALL_VALUE = ''
const NONE_VALUE = '__none__'

interface Props {
  epicCards: EpicCardOption[]
  value: string
  onChange: (value: string) => void
}

export function EpicFilterSelect({ epicCards, value, onChange }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  let triggerLabel = '⚡ All epics'
  if (value === NONE_VALUE) {
    triggerLabel = '— No epic'
  } else if (value !== ALL_VALUE) {
    const found = epicCards.find((e) => e.id === value)
    triggerLabel = found ? found.name : '⚡ All epics'
  }

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  const filtered = epicCards.filter(
    (opt) => !searchQuery.trim() || fuzzyMatch(searchQuery, `${opt.name} ${opt.listName}`)
  )

  function select(val: string) {
    onChange(val)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.triggerLabel}>{triggerLabel}</span>
        <span className={styles.triggerArrow}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={selectStyles.dropdown}>
          <div className={selectStyles.searchWrapper}>
            <input
              ref={searchRef}
              type="text"
              className={selectStyles.searchInput}
              placeholder="Search epics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={`${selectStyles.option} ${value === ALL_VALUE ? selectStyles.optionActive : ''}`}
            onClick={() => select(ALL_VALUE)}
          >
            ⚡ All epics
          </button>
          <button
            type="button"
            className={`${selectStyles.option} ${value === NONE_VALUE ? selectStyles.optionActive : ''}`}
            onClick={() => select(NONE_VALUE)}
          >
            — No epic
          </button>
          {filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`${selectStyles.option} ${value === opt.id ? selectStyles.optionActive : ''}`}
              onClick={() => select(opt.id)}
            >
              <span className={selectStyles.optionName}>{opt.name}</span>
              <span className={selectStyles.optionList}>{opt.listName}</span>
            </button>
          ))}
          {filtered.length === 0 && searchQuery.trim() && (
            <span className={selectStyles.empty}>No epics found</span>
          )}
        </div>
      )}
    </div>
  )
}
