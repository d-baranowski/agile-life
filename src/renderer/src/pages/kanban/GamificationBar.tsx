import type { GamificationStats } from '@shared/analytics.types'
import { gamificationBarWidth } from '../../lib/gamification'
import styles from '../KanbanPage.module.css'

interface Props {
  stats: GamificationStats
}

export default function GamificationBar({ stats }: Props): JSX.Element {
  return (
    <div className={styles.gamificationBar}>
      {/* Previous week reference bar */}
      <div
        className={styles.gamificationTrack}
        data-tooltip={`Last week: ${stats.prevWeekPoints} SP`}
      >
        <div
          className={styles.gamificationFillPrev}
          style={{
            width: gamificationBarWidth(stats.prevWeekPoints, stats.yearlyHighScore)
          }}
        />
      </div>

      {/* Yearly high score — shown above current week when current beats previous */}
      {stats.currentWeekPoints > 0 &&
        stats.currentWeekPoints > stats.prevWeekPoints &&
        stats.yearlyHighScore > stats.prevWeekPoints && (
          <div
            className={styles.gamificationTrack}
            data-tooltip={`🏆 Year best: ${stats.yearlyHighScore} SP`}
          >
            <div className={styles.gamificationFillHigh} style={{ width: '100%' }} />
          </div>
        )}

      {/* Current week bar */}
      <div
        className={styles.gamificationTrack}
        data-tooltip={`${
          stats.currentWeekPoints > stats.prevWeekPoints && stats.currentWeekPoints > 0
            ? '🔥 This week'
            : 'This week'
        }: ${stats.currentWeekPoints} SP`}
      >
        <div
          className={`${styles.gamificationFillCurrent} ${
            stats.currentWeekPoints > stats.prevWeekPoints && stats.currentWeekPoints > 0
              ? styles.gamificationFillCurrentBeat
              : ''
          }`}
          style={{
            width: gamificationBarWidth(stats.currentWeekPoints, stats.yearlyHighScore)
          }}
        />
      </div>
    </div>
  )
}
