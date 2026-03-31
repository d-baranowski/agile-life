import type { StoryPointRule } from '../../../../lib/board.types'
import { MeatballWrapper, MeatballBtn, MeatballMenu, MeatballItem } from './meatball-menu.styled'

interface Props {
  meatballRef: React.RefObject<HTMLDivElement | null>
  showMeatball: boolean
  hasActiveMenuFilter: boolean
  showDuplicates: boolean
  duplicateCount: number
  filterUnassigned: boolean
  filterNoEpic: boolean
  filterNoSize: boolean
  isStoryBoard: boolean
  storyPointsConfig: StoryPointRule[]
  onToggleMeatball: () => void
  onToggleDuplicates: () => void
  onToggleUnassigned: () => void
  onToggleNoEpic: () => void
  onToggleNoSize: () => void
  onOpenTickets: () => void
  onOpenGenerate: () => void
}

export default function KanbanMeatballMenu(props: Props): JSX.Element {
  const {
    meatballRef,
    showMeatball,
    hasActiveMenuFilter,
    showDuplicates,
    duplicateCount,
    filterUnassigned,
    filterNoEpic,
    filterNoSize,
    isStoryBoard,
    storyPointsConfig,
    onToggleMeatball,
    onToggleDuplicates,
    onToggleUnassigned,
    onToggleNoEpic,
    onToggleNoSize,
    onOpenTickets,
    onOpenGenerate
  } = props

  return (
    <MeatballWrapper ref={meatballRef as React.RefObject<HTMLDivElement>}>
      <MeatballBtn
        $active={hasActiveMenuFilter}
        onClick={onToggleMeatball}
        title="More options"
        aria-label="More options"
      >
        •••
      </MeatballBtn>
      {showMeatball && (
        <MeatballMenu>
          <MeatballItem $active={showDuplicates} onClick={onToggleDuplicates}>
            ⊖ Duplicates{duplicateCount > 0 && ` (${duplicateCount})`}
          </MeatballItem>
          <MeatballItem $active={filterUnassigned} onClick={onToggleUnassigned}>
            👤 Unassigned only
          </MeatballItem>
          {isStoryBoard && (
            <MeatballItem $active={filterNoEpic} onClick={onToggleNoEpic}>
              ⚡ No epic only
            </MeatballItem>
          )}
          {storyPointsConfig.length > 0 && (
            <MeatballItem $active={filterNoSize} onClick={onToggleNoSize}>
              📏 No size only
            </MeatballItem>
          )}
          <MeatballItem onClick={onOpenTickets}>🎫 Number Tickets</MeatballItem>
          <MeatballItem onClick={onOpenGenerate}>📋 Generate from Template</MeatballItem>
        </MeatballMenu>
      )}
    </MeatballWrapper>
  )
}
