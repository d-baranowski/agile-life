import { useState, useRef, useEffect } from 'react'
import type { EpicCardOption } from '@shared/board.types'
import { fuzzyMatch } from '../../lib/fuzzy-match'
import {
  Container,
  Trigger,
  TriggerLabel,
  TriggerArrow,
  Dropdown,
  SearchWrapper,
  SearchInput,
  Option,
  OptionName,
  OptionList,
  Empty
} from './styled/epic-select.styled'

interface Props {
  epicCards: EpicCardOption[]
  value: string
  onChange: (id: string) => void
}

export function EpicSelect(props: Props): JSX.Element {
  const { epicCards, value, onChange } = props
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
    <Container ref={containerRef}>
      <Trigger type="button" $open={open} onClick={() => setOpen((o) => !o)}>
        <TriggerLabel>{triggerLabel}</TriggerLabel>
        <TriggerArrow>{open ? '▲' : '▼'}</TriggerArrow>
      </Trigger>

      {open && (
        <Dropdown>
          <SearchWrapper>
            <SearchInput
              ref={searchRef}
              type="text"
              placeholder="Search epics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchWrapper>
          <Option type="button" onClick={() => select('')}>
            — None —
          </Option>
          {filtered.map((opt) => (
            <Option
              key={opt.id}
              type="button"
              $active={value === opt.id}
              onClick={() => select(opt.id)}
            >
              <OptionName>{opt.name}</OptionName>
              <OptionList>{opt.listName}</OptionList>
            </Option>
          ))}
          {filtered.length === 0 && <Empty>No epics found</Empty>}
        </Dropdown>
      )}
    </Container>
  )
}
