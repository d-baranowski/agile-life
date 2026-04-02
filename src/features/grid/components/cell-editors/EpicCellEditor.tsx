import { useState, useCallback, useRef, useEffect } from 'react'
import type { CustomCellEditorProps } from 'ag-grid-react'
import { useGridCellEditor } from 'ag-grid-react'
import type { GridRow } from '../../grid.types'
import type { EpicCardOption } from '../../../../lib/board.types'
import { fuzzyMatch } from '../../../../lib/fuzzy-match'
import {
  Dropdown,
  SearchInput,
  OptionsList,
  OptionItem
} from '../../styled/epic-cell-editor.styled'

interface EpicEditorParams {
  epicOptions: EpicCardOption[]
  onEpicSelected: (cardId: string, epicOption: EpicCardOption | null) => void
}

type Props = CustomCellEditorProps<GridRow, string | null> & EpicEditorParams

export default function EpicCellEditor(props: Props): JSX.Element {
  const { data, value, epicOptions, onEpicSelected, api: gridApi } = props
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useGridCellEditor({
    isCancelAfterEnd: () => true
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = search ? epicOptions.filter((o) => fuzzyMatch(search, o.name)) : epicOptions

  const handleSelect = useCallback(
    (option: EpicCardOption | null) => {
      if (!data) return
      onEpicSelected(data.id, option)
      gridApi.stopEditing()
    },
    [data, onEpicSelected, gridApi]
  )

  const currentValue = value ?? null

  return (
    <Dropdown>
      <SearchInput
        ref={inputRef}
        type="text"
        placeholder="Search epics…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <OptionsList>
        <OptionItem $active={currentValue === null} onClick={() => handleSelect(null)}>
          — None
        </OptionItem>
        {filtered.map((option) => (
          <OptionItem
            key={option.id}
            $active={currentValue === option.name}
            onClick={() => handleSelect(option)}
          >
            {option.name}
          </OptionItem>
        ))}
      </OptionsList>
    </Dropdown>
  )
}
