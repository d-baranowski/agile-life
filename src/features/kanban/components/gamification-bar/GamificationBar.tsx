import styled from 'styled-components'
import type { GamificationStats } from '../../../analytics/analytics.types'
import { gamificationBarWidth } from './gamification-bar-width'

const Bar = styled.div`
  flex-shrink: 0;
  padding: 5px 24px 0px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Track = styled.div`
  position: relative;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: visible;
  cursor: default;

  /* Extend hover hit-area above and below the thin bar */
  &::before {
    content: '';
    position: absolute;
    inset: -3px 0;
  }

  /* CSS tooltip */
  &::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 50%;
    bottom: calc(100% + 8px);
    transform: translateX(-50%);
    background: var(--color-surface, #2a2a2a);
    color: var(--color-text, #fff);
    font-size: 0.72rem;
    white-space: nowrap;
    padding: 3px 7px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease;
    z-index: 100;
  }

  &:hover::after {
    opacity: 1;
  }
`

const FillPrev = styled.div`
  height: 100%;
  background: var(--color-text-muted);
  border-radius: 2px;
  transition: width 0.4s ease;
`

const FillHigh = styled.div`
  height: 100%;
  background: #f5a623;
  border-radius: 2px;
`

const FillCurrent = styled.div<{ $beat: boolean }>`
  height: 100%;
  background: ${(p) => (p.$beat ? '#4caf50' : 'var(--color-accent)')};
  border-radius: 2px;
  transition: width 0.4s ease;
`

interface Props {
  stats: GamificationStats
}

export default function GamificationBar(props: Props): JSX.Element {
  const { stats } = props
  const beating = stats.currentWeekPoints > stats.prevWeekPoints && stats.currentWeekPoints > 0

  return (
    <Bar>
      {/* Previous week reference bar */}
      <Track data-tooltip={`Last week: ${stats.prevWeekPoints} SP`}>
        <FillPrev
          style={{ width: gamificationBarWidth(stats.prevWeekPoints, stats.yearlyHighScore) }}
        />
      </Track>

      {/* Yearly high score — shown above current week when current beats previous */}
      {stats.currentWeekPoints > 0 &&
        stats.currentWeekPoints > stats.prevWeekPoints &&
        stats.yearlyHighScore > stats.prevWeekPoints && (
          <Track data-tooltip={`🏆 Year best: ${stats.yearlyHighScore} SP`}>
            <FillHigh style={{ width: '100%' }} />
          </Track>
        )}

      {/* Current week bar */}
      <Track
        data-tooltip={`${beating ? '🔥 This week' : 'This week'}: ${stats.currentWeekPoints} SP`}
      >
        <FillCurrent
          $beat={beating}
          style={{ width: gamificationBarWidth(stats.currentWeekPoints, stats.yearlyHighScore) }}
        />
      </Track>
    </Bar>
  )
}
