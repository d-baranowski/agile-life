import { weeksAgo } from './weeks-ago'
import { fmtDate } from './fmt-date'
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
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  previewArchiveDoneCards,
  archiveDoneCards,
  fetchDoneColumnDebug,
  archiveWeeksChanged,
  previewCardsDismissed,
  debugToggled
} from './settingsSlice'

interface Props {
  boardId: string
  doneListLabel: string
  doneListCount: number
}

export default function ArchiveDoneCards(props: Props): JSX.Element {
  const { boardId, doneListLabel, doneListCount } = props
  const dispatch = useAppDispatch()

  const archiveWeeks = useAppSelector((s) => s.settings.archiveWeeks)
  const previewing = useAppSelector((s) => s.settings.previewing)
  const previewCards = useAppSelector((s) => s.settings.previewCards)
  const previewError = useAppSelector((s) => s.settings.previewError)
  const archiving = useAppSelector((s) => s.settings.archiving)
  const archiveResult = useAppSelector((s) => s.settings.archiveResult)
  const archiveError = useAppSelector((s) => s.settings.archiveError)

  const debugOpen = useAppSelector((s) => s.settings.debugOpen)
  const debugLoading = useAppSelector((s) => s.settings.debugLoading)
  const debugCards = useAppSelector((s) => s.settings.debugCards)
  const debugError = useAppSelector((s) => s.settings.debugError)

  const handlePreview = async (): Promise<void> => {
    await dispatch(previewArchiveDoneCards({ boardId, weeks: archiveWeeks }))
  }

  const handleArchive = async (): Promise<void> => {
    await dispatch(archiveDoneCards({ boardId, weeks: archiveWeeks }))
  }

  const handleDebugToggle = async (): Promise<void> => {
    if (debugOpen) {
      dispatch(debugToggled())
      return
    }
    dispatch(debugToggled())
    await dispatch(fetchDoneColumnDebug(boardId))
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
              onChange={(e) =>
                dispatch(archiveWeeksChanged(Math.max(1, parseInt(e.target.value, 10) || 1)))
              }
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
                    onClick={() => dispatch(previewCardsDismissed())}
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
