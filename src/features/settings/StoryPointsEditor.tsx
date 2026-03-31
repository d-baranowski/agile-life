import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { selectSelectedBoard, updateBoard } from '../board-switcher/boardsSlice'
import {
  storyPointsRulesChanged,
  storyPointsSavingStarted,
  storyPointsSavingFinished,
  storyPointsSuccessDismissed
} from './settingsSlice'
import { CardTitle, ErrorBanner, SuccessBanner } from './settings-layout.styled'
import { Hint } from './settings-form.styled'
import { SpTable, SpInput, SpPointsInput, SpActions } from './settings-table.styled'

export default function StoryPointsEditor(): JSX.Element {
  const dispatch = useAppDispatch()
  const board = useAppSelector(selectSelectedBoard)!
  const storyPoints = useAppSelector((s) => s.settings.storyPointsRules)
  const spSaving = useAppSelector((s) => s.settings.storyPointsSaving)
  const spError = useAppSelector((s) => s.settings.storyPointsError)
  const spSuccess = useAppSelector((s) => s.settings.storyPointsSuccess)

  const handleSaveStoryPoints = async () => {
    dispatch(storyPointsSavingStarted())

    const validRules = storyPoints
      .filter((r) => r.labelName.trim() !== '')
      .map((r) => ({ labelName: r.labelName.trim(), points: r.points }))

    try {
      await dispatch(
        updateBoard({ boardId: board.boardId, updates: { storyPointsConfig: validRules } })
      ).unwrap()
      dispatch(storyPointsSavingFinished({ success: 'Story point rules saved.' }))
      setTimeout(() => dispatch(storyPointsSuccessDismissed()), 3000)
    } catch (err) {
      dispatch(
        storyPointsSavingFinished({
          error: err instanceof Error ? err.message : 'Failed to save story point rules.'
        })
      )
    }
  }

  return (
    <div className="card">
      <CardTitle>Story Points</CardTitle>
      <Hint as="p">
        Assign story-point values to ticket labels. The analytics trend chart multiplies each
        completed ticket by the points of its first matching label. Tickets with no matching label
        count as <strong>1</strong> point.
      </Hint>

      {spError && <ErrorBanner>{spError}</ErrorBanner>}
      {spSuccess && <SuccessBanner>{spSuccess}</SuccessBanner>}

      <SpTable>
        <thead>
          <tr>
            <th>Label Name</th>
            <th>Points</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {storyPoints.map((rule, idx) => (
            <tr key={idx}>
              <td>
                <SpInput
                  type="text"
                  value={rule.labelName}
                  placeholder="e.g. Large"
                  onChange={(e) => {
                    const next = [...storyPoints]
                    next[idx] = { ...next[idx], labelName: e.target.value }
                    dispatch(storyPointsRulesChanged(next))
                  }}
                />
              </td>
              <td>
                <SpPointsInput
                  type="number"
                  min={0}
                  value={rule.points}
                  onChange={(e) => {
                    const next = [...storyPoints]
                    next[idx] = {
                      ...next[idx],
                      points: Math.max(0, parseInt(e.target.value, 10) || 0)
                    }
                    dispatch(storyPointsRulesChanged(next))
                  }}
                />
              </td>
              <td>
                <button
                  className="btn-ghost"
                  onClick={() =>
                    dispatch(storyPointsRulesChanged(storyPoints.filter((_, i) => i !== idx)))
                  }
                  title="Remove rule"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </SpTable>

      <SpActions>
        <button
          className="btn-ghost"
          onClick={() =>
            dispatch(storyPointsRulesChanged([...storyPoints, { labelName: '', points: 1 }]))
          }
        >
          + Add Rule
        </button>
        <button className="btn-primary" onClick={handleSaveStoryPoints} disabled={spSaving}>
          {spSaving ? 'Saving…' : '✓ Save Story Points'}
        </button>
      </SpActions>
    </div>
  )
}
