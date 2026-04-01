import { useState, useRef, useEffect, useCallback } from 'react'
import {
  AddColumnWrapper,
  AddColumnBtn,
  AddColumnForm,
  AddColumnTextField,
  AddColumnActions,
  AddColumnConfirmBtn,
  AddColumnCancelBtn
} from '../styled/add-column.styled'

interface Props {
  onAdd: (name: string) => void
}

export default function AddColumnInput(props: Props): JSX.Element {
  const { onAdd } = props
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    setName('')
  }, [])

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    setName('')
  }, [])

  const handleConfirm = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setIsOpen(false)
    setName('')
  }, [name, onAdd])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleConfirm()
      if (e.key === 'Escape') handleCancel()
    },
    [handleConfirm, handleCancel]
  )

  if (!isOpen) {
    return (
      <AddColumnWrapper>
        <AddColumnBtn onClick={handleOpen}>+ Add a column</AddColumnBtn>
      </AddColumnWrapper>
    )
  }

  return (
    <AddColumnWrapper>
      <AddColumnForm>
        <AddColumnTextField
          ref={inputRef}
          type="text"
          placeholder="Column name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
        />
        <AddColumnActions>
          <AddColumnConfirmBtn onClick={handleConfirm} disabled={!name.trim()}>
            Add column
          </AddColumnConfirmBtn>
          <AddColumnCancelBtn onClick={handleCancel}>✕</AddColumnCancelBtn>
        </AddColumnActions>
      </AddColumnForm>
    </AddColumnWrapper>
  )
}
