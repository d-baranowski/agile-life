import { useState } from 'react'
import type { ArchiveResult, DoneCardPreview, DoneCardDebugInfo } from '@shared/board.types'
import { api } from '../../hooks/useApi'
import { weeksAgo } from '../../lib/weeks-ago'
import { fmtDate } from '../../lib/fmt-date'
import { CardTitle, ErrorBanner, ArchiveSuccess, Centred } from './settings-layout.styled'
import {
  Hint,
  SyncingLabel,
  ArchiveControls,
  WeeksLabel,
  WeeksInput,
  PreviewSection,
  PreviewEmpty,
  PreviewCount,
  PreviewList,
  PreviewItem,
  PreviewCardName,
  PreviewCardMeta,
  PreviewActions
} from './settings-form.styled'
import {
  DebugHeader,
  DebugTableWrap,
  DebugTable,
  DebugCardName,
  DebugAge,
  DebugBadge
} from './settings-table.styled'

interface Props {
  boardId: string
  doneListLabel: string
  doneListCount: number
}

export default function ArchiveDoneCards(props: Props): JSX.Element {
  const { boardId, doneListLabel, doneListCount } = props
  const [archiveWeeks, setArchiveWeeks] = useState(4)
  const [previewing, setPreviewing] = useState(false)
  const [previewCards, setPreviewCards] = useState<DoneCardPreview[] | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveResult, setArchiveResult] = useState<ArchiveResult | null>(null)
  const [archiveError, setArchiveError] = useState<string | null>(null)

  const [debugOpen, setDebugOpen] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugCards, setDebugCards] = useState<DoneCardDebugInfo[] | null>(null)
  const [debugError, setDebugError] = useState<string | null>(null)

  const handlePreview = async (): Promise<void> => {
    setPreviewing(true)
    setPreviewError(null)
    setPreviewCards(null)
    setArchiveResult(null)
    setArchiveError(null)
    const result = await api.trello.previewArchiveDoneCards(boardId, archiveWeeks)
    if (result.success && result.data) {
      setPreviewCards(result.data)
    } else {
      setPreviewError(result.error ?? 'Preview failed.')
    }
    setPreviewing(false)
  }

  const handleArchive = async (): Promise<void> => {
    setArchiving(true)
    setArchiveError(null)
    setArchiveResult(null)
    const result = await api.trello.archiveDoneCards(boardId, archiveWeeks)
    if (result.success && result.data) {
      setArchiveResult(result.data)
      setPreviewCards(null)
      setDebugCards(null)
    } else {
      setArchiveError(result.error ?? 'Archive failed.')
    }
    setArchiving(false)
  }

  const handleDebugToggle = async (): Promise<void> => {
    if (debugOpen) {
      setDebugOpen(false)
      return
    }
    setDebugOpen(true)
    setDebugLoading(true)
    setDebugError(null)
    const result = await api.trello.getDoneColumnDebug(boardId)
    if (result.success && result.data) {
      setDebugCards(result.data)
    } else {
      setDebugError(result.error ?? 'Failed to load debug data.')
    }
    setDebugLoading(false)
  }

  return (
    <>
      {/* ── Archive Done Cards ── */}
      <div className="card">
        <CardTitle>Archive Done Cards</CardTitle>
        <Hint as="p">
          Archive cards from the <strong>{doneListLabel}</strong>{' '}
          {doneListCount === 1 ? 'column' : 'columns'} on Trello that have been in the done column
          for the selected number of weeks. The cards will remain in your local database (marked as
          archived) so your history is preserved.
        </Hint>

        <ArchiveControls>
          <WeeksLabel>
            In done for at least
            <WeeksInput
              type="number"
              min={1}
              max={52}
              value={archiveWeeks}
              onChange={(e) => setArchiveWeeks(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
            week{archiveWeeks !== 1 ? 's' : ''}
          </WeeksLabel>
          <button
            className="btn-secondary"
            onClick={handlePreview}
            disabled={previewing || archiving}
          >
            {previewing ? (
              <SyncingLabel>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Loading…
              </SyncingLabel>
            ) : (
              '🔍 Preview'
            )}
          </button>
        </ArchiveControls>

        {previewError && <ErrorBanner>{previewError}</ErrorBanner>}
        {archiveError && <ErrorBanner>{archiveError}</ErrorBanner>}

        {archiveResult && (
          <ArchiveSuccess>
            ✓ Archived {archiveResult.archivedCount} card
            {archiveResult.archivedCount !== 1 ? 's' : ''}
            {archiveResult.skippedCount > 0 ? ` (${archiveResult.skippedCount} skipped)` : ''}.
          </ArchiveSuccess>
        )}

        {previewCards !== null && (
          <PreviewSection>
            {previewCards.length === 0 ? (
              <PreviewEmpty>
                No cards have been in the done column for {archiveWeeks} week
                {archiveWeeks !== 1 ? 's' : ''} or more.
              </PreviewEmpty>
            ) : (
              <>
                <PreviewCount>
                  {previewCards.length} card{previewCards.length !== 1 ? 's' : ''} will be archived:
                </PreviewCount>
                <PreviewList>
                  {previewCards.map((card) => (
                    <PreviewItem key={card.id}>
                      <PreviewCardName>{card.name}</PreviewCardName>
                      <PreviewCardMeta>
                        {card.listName} · {weeksAgo(card.enteredDoneAt)} in Done
                      </PreviewCardMeta>
                    </PreviewItem>
                  ))}
                </PreviewList>
                <PreviewActions>
                  <button className="btn-danger" onClick={handleArchive} disabled={archiving}>
                    {archiving ? (
                      <SyncingLabel>
                        <span
                          className="spinner"
                          style={{ width: 14, height: 14, borderWidth: 2 }}
                        />
                        Archiving…
                      </SyncingLabel>
                    ) : (
                      `🗄 Archive ${previewCards.length} Card${previewCards.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setPreviewCards(null)}
                    disabled={archiving}
                  >
                    Cancel
                  </button>
                </PreviewActions>
              </>
            )}
          </PreviewSection>
        )}
      </div>

      {/* ── Diagnostic: Done Column Data ── */}
      <div className="card">
        <DebugHeader>
          <div>
            <CardTitle>Diagnostic: Done Column Data</CardTitle>
            <Hint as="p">
              Shows the raw data stored for every card currently in the{' '}
              <strong>{doneListLabel}</strong> {doneListCount === 1 ? 'column' : 'columns'}. Use
              this to understand why a card is or is not being picked up by the archive threshold.
              The <em>Entered Done</em> timestamp is what the archive query compares against your
              threshold.
            </Hint>
          </div>
          <button
            className="btn-ghost"
            onClick={handleDebugToggle}
            disabled={debugLoading}
            style={{ flexShrink: 0 }}
          >
            {debugOpen ? '▲ Hide' : '▼ Show'}
          </button>
        </DebugHeader>

        {debugOpen && (
          <>
            {debugError && <ErrorBanner>{debugError}</ErrorBanner>}
            {debugLoading && (
              <Centred>
                <div className="spinner" />
                <span>Loading…</span>
              </Centred>
            )}
            {!debugLoading && debugCards !== null && (
              <>
                {debugCards.length === 0 ? (
                  <PreviewEmpty>
                    No open cards found in the <strong>{doneListLabel}</strong>{' '}
                    {doneListCount === 1 ? 'column' : 'columns'}. Make sure you have synced the
                    board and that the done list name matches exactly.
                  </PreviewEmpty>
                ) : (
                  <DebugTableWrap>
                    <DebugTable>
                      <thead>
                        <tr>
                          <th>Card</th>
                          <th>Column</th>
                          <th>Entered Done</th>
                          <th>Last Activity</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debugCards.map((card) => (
                          <tr key={card.id}>
                            <DebugCardName>{card.name}</DebugCardName>
                            <td>{card.listName}</td>
                            <td>
                              {fmtDate(card.enteredDoneAt)}{' '}
                              <DebugAge>({weeksAgo(card.enteredDoneAt)})</DebugAge>
                            </td>
                            <td>{fmtDate(card.dateLastActivity)}</td>
                            <td>
                              <DebugBadge $variant={card.hasActionEntry ? 'action' : 'fallback'}>
                                {card.hasActionEntry ? '🟢 move action' : '🟡 fallback'}
                              </DebugBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </DebugTable>
                  </DebugTableWrap>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
