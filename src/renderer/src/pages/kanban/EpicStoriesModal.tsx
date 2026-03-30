import type { EpicStory } from '@shared/board.types'
import styled from 'styled-components'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1000;
  display: flex;
  align-items: stretch;
  justify-content: center;
`

const Modal = styled.div`
  position: relative;
  background: var(--color-bg);
  width: 100%;
  max-width: 680px;
  max-height: 80vh;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background: var(--color-surface);
`

const Title = styled.h2`
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CloseButton = styled.button`
  position: sticky;
  top: 0;
  align-self: flex-end;
  margin: 12px 16px 0;
  padding: 4px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  z-index: 1;
  transition:
    border-color var(--transition),
    color var(--transition);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
`

const Body = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 24px;
  color: var(--color-text-muted);
`

const EmptyState = styled.p`
  font-size: 0.9rem;
  color: var(--color-text-muted);
  font-style: italic;
  margin: 0;
`

const TrelloLink = styled.a`
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-decoration: none;
  opacity: 0;
  transition:
    opacity var(--transition),
    color var(--transition);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  line-height: 1;

  &:hover {
    color: var(--color-accent);
    background: rgba(233, 69, 96, 0.1);
  }
`

const StoryList = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 8px;
`

const StoryItem = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 2px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  align-items: center;

  ${TrelloLink} {
    grid-column: 2;
    grid-row: 1 / 3;
    align-self: center;
    opacity: 1;
    font-size: 0.8rem;
  }
`

const StoryMeta = styled.div`
  grid-column: 1;
  grid-row: 1;
  display: flex;
  gap: 8px;
  align-items: center;
`

const StoryName = styled.span`
  grid-column: 1;
  grid-row: 2;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
`

const StoryBoardName = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: #9370db;
  background: rgba(147, 112, 219, 0.15);
  border: 1px solid rgba(147, 112, 219, 0.3);
  padding: 1px 6px;
  border-radius: 8px;
`

const StoryListName = styled.span`
  font-size: 0.7rem;
  color: var(--color-text-muted);
`

interface Props {
  cardName: string
  stories: EpicStory[] | null
  loading: boolean
  onClose: () => void
}

export default function EpicStoriesModal(props: Props): JSX.Element {
  const { cardName, stories, loading, onClose } = props

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            📋 Stories for: <em>{cardName}</em>
          </Title>
          <CloseButton onClick={onClose} title="Close (Esc)">
            ✕
          </CloseButton>
        </Header>
        {loading ? (
          <Body>
            <div className="spinner" />
            <span>Loading stories…</span>
          </Body>
        ) : stories && stories.length === 0 ? (
          <Body>
            <EmptyState>No stories assigned to this epic yet.</EmptyState>
          </Body>
        ) : (
          <StoryList>
            {(stories ?? []).map((story) => (
              <StoryItem key={story.id}>
                <StoryMeta>
                  <StoryBoardName>{story.boardName}</StoryBoardName>
                  <StoryListName>{story.listName}</StoryListName>
                </StoryMeta>
                <StoryName>{story.name}</StoryName>
                {story.shortUrl && (
                  <TrelloLink
                    href={story.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Trello"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </TrelloLink>
                )}
              </StoryItem>
            ))}
          </StoryList>
        )}
      </Modal>
    </Overlay>
  )
}
