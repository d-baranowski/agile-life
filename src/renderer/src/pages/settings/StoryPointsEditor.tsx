import { useState } from 'react'
import type { BoardConfig, StoryPointRule } from '@shared/board.types'
import { api } from '../../hooks/useApi'
import { CardTitle, ErrorBanner, SuccessBanner } from './settings-layout.styled'
import { Hint } from './settings-form.styled'
import { SpTable, SpInput, SpPointsInput, SpActions } from './settings-table.styled'

interface Props {
  board: BoardConfig
  onBoardUpdated: (board: BoardConfig) => void
}

export default function StoryPointsEditor(props: Props): JSX.Element {
  const { board, onBoardUpdated } = props
  const [storyPoints, setStoryPoints] = useState<StoryPointRule[]>(board.storyPointsConfig)
  const [spSaving, setSpSaving] = useState(false)
  const [spError, setSpError] = useState<string | null>(null)
  const [spSuccess, setSpSuccess] = useState<string | null>(null)

  const handleSaveStoryPoints = async () => {
    setSpSaving(true)
    setSpError(null)
    setSpSuccess(null)

    const validRules = storyPoints
      .filter((r) => r.labelName.trim() !== '')
      .map((r) => ({ labelName: r.labelName.trim(), points: r.points }))

    const result = await api.boards.update(board.boardId, { storyPointsConfig: validRules })

    setSpSaving(false)

    if (result.success && result.data) {
      onBoardUpdated(result.data)
      setStoryPoints(result.data.storyPointsConfig)
      setSpSuccess('Story point rules saved.')
      setTimeout(() => setSpSuccess(null), 3000)
    } else {
      setSpError(result.error ?? 'Failed to save story point rules.')
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
                    setStoryPoints(next)
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
                    setStoryPoints(next)
                  }}
                />
              </td>
              <td>
                <button
                  className="btn-ghost"
                  onClick={() => setStoryPoints(storyPoints.filter((_, i) => i !== idx))}
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
          onClick={() => setStoryPoints([...storyPoints, { labelName: '', points: 1 }])}
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
