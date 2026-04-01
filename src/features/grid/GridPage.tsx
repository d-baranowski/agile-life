import { useCallback, useRef, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import type { ColDef, SelectionChangedEvent, CellValueChangedEvent } from 'ag-grid-community'
import type { BoardConfig } from '../../lib/board.types'
import type { GridRow } from './grid.types'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  cardToggleSelected,
  cardRenamed,
  columnsUpdated,
  kanbanToastShown
} from '../kanban/kanbanSlice'
import { useBulkActions } from '../kanban/hooks/useBulkActions'
import { useBulkLabelQueue } from '../kanban/hooks/useBulkLabelQueue'
import { useGridRows } from './hooks/useGridRows'
import { useGridExport } from './hooks/useGridExport'
import BulkArchiveModal from '../kanban/components/bulk-archive/BulkArchiveModal'
import BulkMemberModal from '../kanban/components/BulkMemberModal'
import BulkLabelModal from '../kanban/components/bulk-label/BulkLabelModal'
import GridToolbar from './components/GridToolbar'
import LabelsCellRenderer from './components/cell-renderers/LabelsCellRenderer'
import MembersCellRenderer from './components/cell-renderers/MembersCellRenderer'
import { PageWrapper, GridWrapper } from './styled/grid-page.styled'
import { formatAge } from '../../lib/format-age'
import { moveCard } from '../kanban/move-card'
import { api } from '../api/useApi'

ModuleRegistry.registerModules([AllCommunityModule])

const darkTheme = themeQuartz.withParams({
  backgroundColor: '#1a202c',
  foregroundColor: '#e2e8f0',
  headerBackgroundColor: '#2d3748',
  oddRowBackgroundColor: '#1a202c',
  rowHoverColor: '#2d374880',
  borderColor: '#4a5568',
  chromeBackgroundColor: '#2d3748',
  headerTextColor: '#a0aec0'
})

interface Props {
  board: BoardConfig
}

export default function GridPage(props: Props): JSX.Element {
  const { board } = props
  const dispatch = useAppDispatch()
  const columns = useAppSelector((s) => s.kanban.columns)
  const boardLabels = useAppSelector((s) => s.kanban.boardLabels)
  const boardMembers = useAppSelector((s) => s.kanban.boardMembers)
  const selectedCardIds = useAppSelector((s) => s.kanban.selectedCardIds)

  const storyPointsConfig = board.storyPointsConfig ?? []
  const isStoryBoard = !!board.epicBoardId
  const rows = useGridRows(storyPointsConfig)
  const { exportToExcel } = useGridExport()

  const bulk = useBulkActions(board.boardId)
  const bulkLabel = useBulkLabelQueue(board.boardId)

  const gridRef = useRef<AgGridReact<GridRow>>(null)

  const columnNames = useMemo(() => columns.map((c) => c.name), [columns])

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<GridRow>) => {
      const selectedRows = event.api.getSelectedRows()
      const newIds = new Set(selectedRows.map((r) => r.id))
      const currentSet = new Set(selectedCardIds)

      // Removed IDs
      for (const id of currentSet) {
        if (!newIds.has(id)) dispatch(cardToggleSelected(id))
      }
      // Added IDs
      for (const id of newIds) {
        if (!currentSet.has(id)) dispatch(cardToggleSelected(id))
      }
    },
    [dispatch, selectedCardIds]
  )

  const handleExport = useCallback(() => {
    exportToExcel(rows, board.boardName)
  }, [exportToExcel, rows, board.boardName])

  const handleColumnChange = useCallback(
    async (event: CellValueChangedEvent<GridRow>) => {
      const newColName: string = event.newValue
      const oldColName: string = event.oldValue
      if (newColName === oldColName) return

      const cardId = event.data.id
      const fromCol = columns.find((c) => c.name === oldColName)
      const toCol = columns.find((c) => c.name === newColName)
      if (!fromCol || !toCol) return

      const fromIndex = fromCol.cards.findIndex((c) => c.id === cardId)
      if (fromIndex === -1) return

      // Place the card at the end of the destination column
      const destCards = toCol.cards
      const newPos = destCards.length > 0 ? destCards[destCards.length - 1].pos + 65536 : 65536

      const prevColumns = columns
      const movedColumns = moveCard(columns, fromCol.id, toCol.id, fromIndex, destCards.length)
      dispatch(
        columnsUpdated(
          movedColumns.map((c) =>
            c.id === toCol.id
              ? {
                  ...c,
                  cards: c.cards.map((card, i) =>
                    i === destCards.length ? { ...card, pos: newPos } : card
                  )
                }
              : c
          )
        )
      )

      const syncResult = await api.trello.moveCard(board.boardId, cardId, toCol.id, newPos)
      if (!syncResult.success) {
        dispatch(columnsUpdated(prevColumns))
        dispatch(kanbanToastShown(syncResult.error ?? 'Failed to move card. Please try again.'))
      }
    },
    [board.boardId, columns, dispatch]
  )

  const handleNameChange = useCallback(
    async (event: CellValueChangedEvent<GridRow>) => {
      const newName: string = event.newValue?.trim()
      const oldName: string = event.oldValue
      if (!newName || newName === oldName) {
        // Revert the grid cell if the name is empty
        if (!newName) event.api.applyTransaction({ update: [{ ...event.data, name: oldName }] })
        return
      }

      const cardId = event.data.id
      dispatch(cardRenamed({ cardId, newName }))

      const syncResult = await api.trello.renameCard(board.boardId, cardId, newName)
      if (!syncResult.success) {
        dispatch(cardRenamed({ cardId, newName: oldName }))
        dispatch(kanbanToastShown(syncResult.error ?? 'Failed to rename card. Please try again.'))
      }
    },
    [board.boardId, dispatch]
  )

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<GridRow>) => {
      if (event.colDef.field === 'columnName') {
        handleColumnChange(event)
      } else if (event.colDef.field === 'name') {
        handleNameChange(event)
      }
    },
    [handleColumnChange, handleNameChange]
  )

  const colDefs: ColDef<GridRow>[] = [
    {
      field: 'name',
      headerName: 'Title',
      flex: 3,
      minWidth: 200,
      editable: true,
      cellStyle: { fontWeight: 500, cursor: 'pointer' }
    },
    {
      field: 'columnName',
      headerName: 'Column',
      flex: 1,
      minWidth: 120,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: columnNames },
      cellStyle: { cursor: 'pointer' }
    },
    {
      field: 'members',
      headerName: 'Members',
      flex: 2,
      minWidth: 140,
      cellRenderer: MembersCellRenderer,
      sortable: false
    },
    {
      field: 'labels',
      headerName: 'Labels',
      flex: 2,
      minWidth: 140,
      cellRenderer: LabelsCellRenderer,
      sortable: false
    },
    ...(isStoryBoard
      ? [
          {
            field: 'epicCardName' as keyof GridRow,
            headerName: 'Epic',
            flex: 1,
            minWidth: 120
          } as ColDef<GridRow>
        ]
      : []),
    ...(storyPointsConfig.length > 0
      ? [
          {
            field: 'storyPoints' as keyof GridRow,
            headerName: 'Points',
            width: 80,
            minWidth: 70,
            maxWidth: 100
          } as ColDef<GridRow>
        ]
      : []),
    {
      field: 'dateLastActivity',
      headerName: 'Activity',
      width: 90,
      minWidth: 80,
      valueFormatter: (p) => (p.value ? formatAge(p.value as string) : '—')
    }
  ]

  return (
    <PageWrapper>
      <GridToolbar
        isStoryBoard={isStoryBoard}
        boardMembers={boardMembers}
        onExport={handleExport}
        onOpenBulkArchive={bulk.handleOpenBulkArchive}
        onOpenBulkLabel={bulkLabel.handleOpenBulkLabelFromBar}
        onOpenBulkMemberModal={bulk.handleOpenBulkMemberModal}
      />

      <GridWrapper>
        <AgGridReact<GridRow>
          ref={gridRef}
          theme={darkTheme}
          rowData={rows}
          columnDefs={colDefs}
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
          onSelectionChanged={handleSelectionChanged}
          onCellValueChanged={handleCellValueChanged}
          rowHeight={40}
          getRowId={(p) => p.data.id}
          suppressCellFocus={false}
        />
      </GridWrapper>

      {bulkLabel.bulkLabelModal && (
        <BulkLabelModal
          modal={bulkLabel.bulkLabelModal}
          boardLabels={boardLabels}
          selectedCardCount={selectedCardIds.length}
          textareaRef={bulkLabel.bulkLabelTextareaRef}
          onTextChange={bulkLabel.handleBulkLabelTextChange}
          onToggleLabelSelection={bulkLabel.handleToggleBulkLabelSelection}
          onStart={bulkLabel.handleStartBulkLabel}
          onRunBulkLabel={bulkLabel.handleRunBulkLabel}
          onRetryItem={bulkLabel.handleBulkLabelRetryItem}
          onRetryAllFailed={bulkLabel.handleBulkLabelRetryAllFailed}
          onClose={bulkLabel.handleCloseBulkLabel}
        />
      )}

      {bulk.bulkArchiveModal && (
        <BulkArchiveModal
          modal={bulk.bulkArchiveModal}
          columns={columns}
          selectedCardIds={bulk.selectedCardIds}
          onStart={bulk.handleStartBulkArchive}
          onRun={bulk.handleRunBulkArchive}
          onRetryItem={bulk.handleBulkArchiveRetryItem}
          onRetryAllFailed={bulk.handleBulkArchiveRetryAllFailed}
          onClose={bulk.handleCloseBulkArchive}
        />
      )}

      {bulk.bulkMemberModal && (
        <BulkMemberModal
          modal={bulk.bulkMemberModal}
          columns={columns}
          selectedCardIds={bulk.selectedCardIds}
          onStart={bulk.handleStartBulkMember}
          onRun={bulk.handleRunBulkMember}
          onRetryItem={bulk.handleBulkMemberRetryItem}
          onRetryAllFailed={bulk.handleBulkMemberRetryAllFailed}
          onClose={bulk.handleCloseBulkMember}
        />
      )}
    </PageWrapper>
  )
}
