import { useState } from 'react'
import type { BoardConfig, StoryPointRule } from '@shared/board.types'
import { api } from '../../hooks/useApi'
import styles from '../SettingsPage.module.css'

interface Props {
  board: BoardConfig
  onBoardUpdated: (board: BoardConfig) => void
}

export default function StoryPointsEditor({ board, onBoardUpdated }: Props): JSX.Element {
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
      <h2 className={styles.cardTitle}>Story Points</h2>
      <p className={styles.hint}>
        Assign story-point values to ticket labels. The analytics trend chart multiplies each
        completed ticket by the points of its first matching label. Tickets with no matching label
        count as <strong>1</strong> point.
      </p>

      {spError && <div className={styles.errorBanner}>{spError}</div>}
      {spSuccess && <div className={styles.successBanner}>{spSuccess}</div>}

      <table className={styles.spTable}>
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
                <input
                  type="text"
                  value={rule.labelName}
                  placeholder="e.g. Large"
                  onChange={(e) => {
                    const next = [...storyPoints]
                    next[idx] = { ...next[idx], labelName: e.target.value }
                    setStoryPoints(next)
                  }}
                  className={styles.spInput}
                />
              </td>
              <td>
                <input
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
                  className={styles.spPointsInput}
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
      </table>

      <div className={styles.spActions}>
        <button
          className="btn-ghost"
          onClick={() => setStoryPoints([...storyPoints, { labelName: '', points: 1 }])}
        >
          + Add Rule
        </button>
        <button className="btn-primary" onClick={handleSaveStoryPoints} disabled={spSaving}>
          {spSaving ? 'Saving…' : '✓ Save Story Points'}
        </button>
      </div>
    </div>
  )
}
