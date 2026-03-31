/**
 * Ticket Numbering page — assigns JIRA-style prefixes (e.g. AGI-000001) to
 * every open Trello card that does not already have one.
 */
import { useEffect, useRef } from 'react'
import type { BoardConfig } from '../../lib/board.types'
import { api } from '../api/useApi'
import {
  Container,
  Title,
  Description,
  ErrorBanner,
  CardTitle,
  ConfigGrid,
  Label,
  Hint,
  PreviewBox,
  Code,
  StatusRow,
  StatusBadge,
  Actions
} from './tickets-layout.styled'
import {
  Table,
  CellMuted,
  ActionsCol,
  StatusCol,
  StatusCell,
  CardRow,
  BadgeQueued,
  BadgeInProgress,
  BadgeSuccess,
  BadgeCancelled,
  BadgeError,
  ProposedName,
  RemoveBtn,
  ErrorToggle,
  ErrorDetailRow,
  ErrorDetail
} from './tickets-table.styled'
import { ProgressSummary, SummarySpinner, Spinner } from './tickets-progress.styled'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchTicketConfig,
  saveTicketConfig,
  previewUnnumbered,
  ticketsPageReset,
  projectCodeChanged,
  nextTicketNumberChanged,
  configErrorSet,
  cardRemovedFromPreview,
  applyStarted,
  cardStatusUpdated,
  cardRemovedFromQueue,
  applyCancelled,
  applyFinished,
  errorDetailToggled
} from './ticketsSlice'

interface Props {
  board: BoardConfig
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function TicketNumberingPage(props: Props): JSX.Element {
  const { board } = props
  const dispatch = useAppDispatch()

  const config = useAppSelector((s) => s.tickets.config)
  const projectCode = useAppSelector((s) => s.tickets.projectCode)
  const nextTicketNumber = useAppSelector((s) => s.tickets.nextTicketNumber)
  const configError = useAppSelector((s) => s.tickets.configError)
  const savingConfig = useAppSelector((s) => s.tickets.savingConfig)

  const preview = useAppSelector((s) => s.tickets.preview)
  const loadingPreview = useAppSelector((s) => s.tickets.loadingPreview)
  const previewError = useAppSelector((s) => s.tickets.previewError)

  const cardStates = useAppSelector((s) => s.tickets.cardStates)
  const applying = useAppSelector((s) => s.tickets.applying)

  // Refs used to signal the running apply loop without re-renders
  const cancelledRef = useRef(false)
  const skipSetRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    dispatch(ticketsPageReset())
    dispatch(fetchTicketConfig(board.boardId))
  }, [dispatch, board.boardId])

  const handleSaveConfig = () => {
    const code = projectCode.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(code)) {
      dispatch(configErrorSet('Project code must be exactly 3 uppercase letters (e.g. AGI).'))
      return
    }
    dispatch(saveTicketConfig({ boardId: board.boardId, projectCode: code, nextTicketNumber }))
  }

  const handlePreview = () => {
    dispatch(previewUnnumbered(board.boardId))
  }

  /** Remove a card from the preview list before Apply has been clicked. */
  const removeFromPreview = (cardId: string) => {
    dispatch(cardRemovedFromPreview(cardId))
  }

  /**
   * Remove a queued card while Apply is running.
   * Adds the cardId to the skip-set so the loop bypasses it, and removes it
   * from the visible card list immediately.
   */
  const removeFromQueue = (cardId: string) => {
    skipSetRef.current.add(cardId)
    dispatch(cardRemovedFromQueue(cardId))
  }

  /** Signal the running apply loop to stop after the current card finishes. */
  const handleCancel = () => {
    cancelledRef.current = true
  }

  const handleApply = async () => {
    if (!preview || preview.length === 0) return

    cancelledRef.current = false
    skipSetRef.current = new Set()

    // Snapshot the preview cards before dispatching applyStarted (which clears preview)
    const cardsToProcess = [...preview]

    dispatch(applyStarted())

    // Only delay between actual API calls — skipped/removed cards don't count.
    let needsDelay = false

    for (let i = 0; i < cardsToProcess.length; i++) {
      const { cardId, proposedName } = cardsToProcess[i]

      // Stop if the user pressed Cancel
      if (cancelledRef.current) break

      // Skip if the user removed this card from the queue while the batch ran
      if (skipSetRef.current.has(cardId)) continue

      // Space out actual Trello API calls to stay within the ~10 req/s rate limit.
      if (needsDelay) await sleep(200)
      needsDelay = true

      // Mark as in-progress
      dispatch(cardStatusUpdated({ cardId, status: 'in-progress' }))

      const result = await api.tickets.applySingleCard(board.boardId, cardId, proposedName)

      if (result.success) {
        dispatch(cardStatusUpdated({ cardId, status: 'success' }))
      } else {
        dispatch(cardStatusUpdated({ cardId, status: 'error', error: result.error }))
      }
    }

    // Mark any cards still queued as cancelled (only reachable when cancelled)
    if (cancelledRef.current) {
      dispatch(applyCancelled())
    } else {
      dispatch(applyFinished())
    }

    dispatch(fetchTicketConfig(board.boardId))
  }

  // Derived counts for the summary line shown after/during apply
  const successCount = cardStates?.filter((cs) => cs.status === 'success').length ?? 0
  const errorCount = cardStates?.filter((cs) => cs.status === 'error').length ?? 0
  const cancelledCount = cardStates?.filter((cs) => cs.status === 'cancelled').length ?? 0
  const processedCount = successCount + errorCount
  const totalCount = cardStates?.length ?? 0

  // Choose summary banner variant
  const summaryVariant: 'running' | 'success' | 'partial' =
    !applying && errorCount === 0 && cancelledCount === 0
      ? 'success'
      : !applying && (cancelledCount > 0 || errorCount > 0)
        ? 'partial'
        : 'running'

  return (
    <Container>
      {/* ── Title ── */}
      <Title>🎫 Ticket Numbering — {board.boardName}</Title>
      <Description>
        Assigns a unique <code>AGI-000001</code>-style prefix to every open card that doesn&apos;t
        already have one. Cards already prefixed are left untouched.
      </Description>

      {/* ── Config card ── */}
      <div className="card">
        <CardTitle>Configuration</CardTitle>

        <ConfigGrid>
          <Label>
            Project Code
            <Hint>Exactly 3 uppercase letters</Hint>
            <input
              className="input"
              value={projectCode}
              maxLength={3}
              placeholder="AGI"
              onChange={(e) => dispatch(projectCodeChanged(e.target.value.toUpperCase()))}
            />
          </Label>

          <Label>
            Next Ticket Number
            <Hint>Never lower than the current value</Hint>
            <input
              className="input"
              type="number"
              min={config?.nextTicketNumber ?? 1}
              value={nextTicketNumber}
              onChange={(e) => dispatch(nextTicketNumberChanged(Number(e.target.value)))}
            />
          </Label>
        </ConfigGrid>

        {/* Preview of upcoming prefix */}
        <PreviewBox>
          Next card will be prefixed:{' '}
          <Code>
            {projectCode.length === 3
              ? `${projectCode.toUpperCase()}-${String(nextTicketNumber).padStart(6, '0')} `
              : '???-000001 '}
          </Code>
        </PreviewBox>

        {configError && <ErrorBanner>{configError}</ErrorBanner>}

        <button className="btn-primary" onClick={handleSaveConfig} disabled={savingConfig}>
          {savingConfig ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>

      {/* ── Status card ── */}
      {config && (
        <div className="card">
          <CardTitle>Status</CardTitle>
          <StatusRow>
            <StatusBadge $variant={config.unnumberedCount === 0 ? 'ok' : 'warn'}>
              {config.unnumberedCount === 0
                ? '✅ All open cards are numbered'
                : `⚠️ ${config.unnumberedCount} card${config.unnumberedCount !== 1 ? 's' : ''} need numbering`}
            </StatusBadge>
          </StatusRow>
        </div>
      )}

      {/* ── Preview + Apply card ── */}
      <div className="card">
        <CardTitle>Apply Numbering</CardTitle>

        {previewError && <ErrorBanner>{previewError}</ErrorBanner>}

        {/* Progress summary while applying or after completion */}
        {cardStates && (
          <ProgressSummary $variant={summaryVariant}>
            {applying ? (
              <>
                <SummarySpinner />
                Applying… {processedCount} / {totalCount} done
                {errorCount > 0 && ` · ${errorCount} failed`}
              </>
            ) : cancelledCount > 0 ? (
              <>
                🚫 Cancelled — {successCount} updated
                {errorCount > 0 && `, ${errorCount} failed`}
                {cancelledCount > 0 && `, ${cancelledCount} cancelled`}.
              </>
            ) : errorCount === 0 ? (
              <>
                ✅ All {successCount} card{successCount !== 1 ? 's' : ''} updated successfully.
              </>
            ) : (
              <>
                ⚠️ {successCount} updated, {errorCount} failed.
              </>
            )}
          </ProgressSummary>
        )}

        {/* Empty state */}
        {preview && preview.length === 0 && !cardStates && (
          <Description>No unnumbered cards found — nothing to do.</Description>
        )}

        {/* Card table — preview mode (before apply) */}
        {preview && preview.length > 0 && !cardStates && (
          <Table>
            <thead>
              <tr>
                <th>List</th>
                <th>Current Name</th>
                <th>Proposed Name</th>
                <ActionsCol />
              </tr>
            </thead>
            <tbody>
              {preview.map((card) => (
                <tr key={card.cardId}>
                  <CellMuted>{card.listName}</CellMuted>
                  <td>{card.cardName}</td>
                  <td>
                    <ProposedName>{card.proposedName}</ProposedName>
                  </td>
                  <td>
                    <RemoveBtn
                      title="Remove from queue"
                      onClick={() => removeFromPreview(card.cardId)}
                    >
                      ✕ Remove
                    </RemoveBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {/* Card table — apply mode (while running or after completion) */}
        {cardStates && (
          <Table>
            <thead>
              <tr>
                <StatusCol>Status</StatusCol>
                <th>List</th>
                <th>Current Name</th>
                <th>Proposed Name</th>
                <ActionsCol />
              </tr>
            </thead>
            <tbody>
              {cardStates.map((cs) => (
                <>
                  <CardRow key={cs.card.cardId} $status={cs.status}>
                    <StatusCell>
                      {cs.status === 'queued' && <BadgeQueued>⏳ Queued</BadgeQueued>}
                      {cs.status === 'in-progress' && (
                        <BadgeInProgress>
                          <Spinner /> Updating…
                        </BadgeInProgress>
                      )}
                      {cs.status === 'success' && <BadgeSuccess>✅ Done</BadgeSuccess>}
                      {cs.status === 'cancelled' && <BadgeCancelled>🚫 Cancelled</BadgeCancelled>}
                      {cs.status === 'error' && (
                        <BadgeError>
                          ❌ Failed
                          <ErrorToggle onClick={() => dispatch(errorDetailToggled(cs.card.cardId))}>
                            {cs.showError ? 'Hide' : 'Details'}
                          </ErrorToggle>
                        </BadgeError>
                      )}
                    </StatusCell>
                    <CellMuted>{cs.card.listName}</CellMuted>
                    <td>{cs.card.cardName}</td>
                    <td>
                      <ProposedName>{cs.card.proposedName}</ProposedName>
                    </td>
                    <td>
                      {cs.status === 'queued' && (
                        <RemoveBtn
                          title="Remove from queue"
                          onClick={() => removeFromQueue(cs.card.cardId)}
                        >
                          ✕ Remove
                        </RemoveBtn>
                      )}
                    </td>
                  </CardRow>
                  {cs.status === 'error' && cs.showError && cs.error && (
                    <ErrorDetailRow key={`${cs.card.cardId}-err`}>
                      <td colSpan={5}>
                        <ErrorDetail>{cs.error}</ErrorDetail>
                      </td>
                    </ErrorDetailRow>
                  )}
                </>
              ))}
            </tbody>
          </Table>
        )}

        <Actions>
          <button
            className="btn-secondary"
            onClick={handlePreview}
            disabled={loadingPreview || applying}
          >
            {loadingPreview ? 'Loading…' : '🔍 Preview'}
          </button>
          {preview && preview.length > 0 && !cardStates && (
            <button className="btn-primary" onClick={handleApply} disabled={applying}>
              ▶ Apply to {preview.length} card{preview.length !== 1 ? 's' : ''}
            </button>
          )}
          {applying && (
            <button className="btn-danger" onClick={handleCancel}>
              ✕ Cancel
            </button>
          )}
        </Actions>
      </div>
    </Container>
  )
}
