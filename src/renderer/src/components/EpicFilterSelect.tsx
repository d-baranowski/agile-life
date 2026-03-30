import { useState, useRef, useEffect } from 'react'
import type { EpicCardOption } from '@shared/board.types'
import { fuzzyMatch } from '../lib/fuzzy-match'
import {
  Container,
  Trigger,
  TriggerLabel,
  TriggerArrow,
  Dropdown
} from './styled/epic-filter-select.styled'
import {
  SearchWrapper,
  SearchInput,
  Option,
  OptionName,
  OptionList,
  Empty
} from './styled/epic-select.styled'

const ALL_VALUE = ''
const NONE_VALUE = '__none__'

interface Props {
  epicCards: EpicCardOption[]
  value: string
  onChange: (value: string) => void
}

export function EpicFilterSelect(props: Props): JSX.Element {
  const { epicCards, value, onChange } = props
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
          <Option type="button" $active={value === ALL_VALUE} onClick={() => select(ALL_VALUE)}>
            ⚡ All epics
          </Option>
          <Option type="button" $active={value === NONE_VALUE} onClick={() => select(NONE_VALUE)}>
            — No epic
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
          {filtered.length === 0 && searchQuery.trim() && <Empty>No epics found</Empty>}
        </Dropdown>
      )}
    </Container>
  )
}
