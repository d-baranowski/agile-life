import { useState, useRef, useEffect } from 'react'
import type { EpicCardOption } from '@shared/board.types'
import { fuzzyMatch } from '../lib/fuzzy-match'
import styles from './EpicSelect.module.css'

interface Props {
  epicCards: EpicCardOption[]
  value: string
  onChange: (id: string) => void
}

export function EpicSelect({ epicCards, value, onChange }: Props): JSX.Element {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedEpic = epicCards.find((e) => e.id === value)
  const triggerLabel = selectedEpic ? selectedEpic.name : '— None —'

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

  function select(id: string) {
    onChange(id)
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
        <div className={styles.dropdown}>
          <div className={styles.searchWrapper}>
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder="Search epics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="button" className={styles.option} onClick={() => select('')}>
            — None —
          </button>
          {filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.option} ${value === opt.id ? styles.optionActive : ''}`}
              onClick={() => select(opt.id)}
            >
              <span className={styles.optionName}>{opt.name}</span>
              <span className={styles.optionList}>{opt.listName}</span>
            </button>
          ))}
          {filtered.length === 0 && <span className={styles.empty}>No epics found</span>}
        </div>
      )}
    </div>
  )
}
