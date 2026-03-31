import { useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import type { ColDef, SelectionChangedEvent } from 'ag-grid-community'
import type { BoardConfig } from '../../lib/board.types'
import type { GridRow } from './grid.types'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { cardToggleSelected } from '../kanban/kanbanSlice'
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
  const selectedCardIds = useAppSelector((s) => s.kanban.selectedCardIds)

  const storyPointsConfig = board.storyPointsConfig ?? []
  const isStoryBoard = !!board.epicBoardId
  const rows = useGridRows(storyPointsConfig)
  const { exportToExcel } = useGridExport()

  const bulk = useBulkActions(board.boardId)
  const bulkLabel = useBulkLabelQueue(board.boardId)

  const gridRef = useRef<AgGridReact<GridRow>>(null)

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

  const colDefs: ColDef<GridRow>[] = [
    {
      field: 'name',
      headerName: 'Title',
      flex: 3,
      minWidth: 200,
      cellStyle: { fontWeight: 500 }
    },
    {
      field: 'columnName',
      headerName: 'Column',
      flex: 1,
      minWidth: 120
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
        onExport={handleExport}
        onOpenBulkArchive={bulk.handleOpenBulkArchive}
        onOpenBulkLabel={bulkLabel.handleOpenBulkLabelFromBar}
        onOpenBulkMember={bulk.handleOpenBulkMemberModal}
      />

      <GridWrapper>
        <AgGridReact<GridRow>
          ref={gridRef}
          theme={darkTheme}
          rowData={rows}
          columnDefs={colDefs}
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true }}
          onSelectionChanged={handleSelectionChanged}
          rowHeight={40}
          getRowId={(p) => p.data.id}
          suppressCellFocus
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
