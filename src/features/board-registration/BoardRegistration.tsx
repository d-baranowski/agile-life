import { useState, useEffect } from 'react'
import type { BoardConfig } from '../../lib/board.types'
import type { TrelloBoard } from '../../trello/trello.types'
import { api } from '../api/useApi'
import { BoardDesc, BoardList, BoardName, BoardOption } from './registration-boards.styled'
import {
  ActionLink,
  Form,
  GuideList,
  Hint,
  InfoPanel,
  Label,
  LinkRow,
  Optional,
  TipBox
} from './registration-form.styled'
import {
  Actions,
  Card,
  Container,
  ErrorBanner,
  RegistrationHeader,
  Step,
  StepLabel,
  StepNumber,
  Steps
} from './registration-layout.styled'

interface Props {
  onBoardAdded: (board: BoardConfig) => void
  onCancel?: () => void
}

type StepType = 'credentials' | 'select-board' | 'configure'

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function normalizeApiKey(value: string): string {
  return value.trim()
}

function normalizeApiToken(value: string): string {
  const trimmed = value.trim()

  try {
    const parsed = new URL(trimmed)
    const searchToken = parsed.searchParams.get('token')
    if (searchToken) return searchToken.trim()

    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''))
    const hashToken = hashParams.get('token')
    if (hashToken) return hashToken.trim()
  } catch {
    return trimmed
  }

  return trimmed
}

function getTrelloAuthorizeUrl(apiKey: string): string {
  const params = new URLSearchParams({
    expiration: 'never',
    scope: 'read,write',
    response_type: 'token',
    name: 'Agile Life',
    key: apiKey
  })

  return `https://trello.com/1/authorize?${params.toString()}`
}

export default function BoardRegistration(props: Props): JSX.Element {
  const { onBoardAdded, onCancel } = props
  const [step, setStep] = useState<StepType>('credentials')
  const [apiKey, setApiKey] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [boards, setBoards] = useState<TrelloBoard[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [doneListNames, setDoneListNames] = useState('Done')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const normalizedApiKey = normalizeApiKey(apiKey)
  const normalizedApiToken = normalizeApiToken(apiToken)
  const authorizeUrl = normalizedApiKey ? getTrelloAuthorizeUrl(normalizedApiKey) : ''

  // Pre-fill credentials from the most recently saved board, if any
  useEffect(() => {
    api.boards.getSavedCredentials().then((result) => {
      if (result.success && result.data) {
        setApiKey(result.data.apiKey)
        setApiToken(result.data.apiToken)
      }
    })
  }, [])

  // ── Step 1: Validate credentials & fetch boards ───────────────────────────
  const handleFetchBoards = async () => {
    if (!normalizedApiKey || !normalizedApiToken) {
      setError('Enter your Trello API key, then generate and paste a token.')
      return
    }

    if (looksLikeUrl(normalizedApiKey)) {
      setError(
        'That looks like a Trello settings page URL, not the API key itself. Open the page and copy the API Key value.'
      )
      return
    }

    setLoading(true)
    setError(null)

    const result = await api.boards.fetchFromTrello(normalizedApiKey, normalizedApiToken)
    setLoading(false)

    if (!result.success || !result.data) {
      setError(
        result.error === 'Invalid Trello API credentials'
          ? 'Trello rejected that key/token pair. Use the API key value from the Power-Up page, click Open Trello authorization, approve access, then paste the token Trello shows.'
          : (result.error ?? 'Failed to connect to Trello.')
      )
      return
    }

    if (result.data.length === 0) {
      setError('Connected successfully, but no open Trello boards were found for this account.')
      return
    }

    setBoards(result.data)
    setStep('select-board')
  }

  // ── Step 2: Select a board ─────────────────────────────────────────────────
  const handleSelectBoard = () => {
    if (!selectedBoardId) {
      setError('Please select a board.')
      return
    }
    setError(null)
    setStep('configure')
  }

  // ── Step 3: Save configuration ─────────────────────────────────────────────
  const handleSave = async () => {
    const chosenBoard = boards.find((b) => b.id === selectedBoardId)
    if (!chosenBoard) {
      setError('Selected board not found.')
      return
    }

    if (projectCode && !/^[A-Z]{3}$/.test(projectCode.toUpperCase())) {
      setError('Project code must be exactly 3 uppercase letters (e.g. AGI).')
      return
    }

    const parsedDoneNames = doneListNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    setLoading(true)
    setError(null)

    const result = await api.boards.add({
      boardId: chosenBoard.id,
      boardName: chosenBoard.name,
      apiKey: normalizedApiKey,
      apiToken: normalizedApiToken,
      projectCode: projectCode.toUpperCase(),
      nextTicketNumber: 1,
      doneListNames: parsedDoneNames.length > 0 ? parsedDoneNames : ['Done'],
      storyPointsConfig: [
        { labelName: 'Large', points: 5 },
        { labelName: 'Medium', points: 3 },
        { labelName: 'Small', points: 1 }
      ],
      myMemberId: null
    })

    setLoading(false)

    if (!result.success || !result.data) {
      setError(result.error ?? 'Failed to save board.')
      return
    }

    onBoardAdded(result.data)
  }

  return (
    <Container>
      <Card>
        {/* ── Header ── */}
        <RegistrationHeader>
          <h2>Register a Trello Board</h2>
          {onCancel && (
            <button className="btn-ghost" onClick={onCancel}>
              ✕ Cancel
            </button>
          )}
        </RegistrationHeader>

        {/* ── Step Indicator ── */}
        <Steps>
          {(['credentials', 'select-board', 'configure'] as StepType[]).map((s, idx) => {
            const isActive = step === s
            const isDone = ['credentials', 'select-board', 'configure'].indexOf(step) > idx
            return (
              <Step key={s} $active={isActive} $done={isDone}>
                <StepNumber $active={isActive} $done={isDone}>
                  {idx + 1}
                </StepNumber>
                <StepLabel>
                  {s === 'credentials' && 'Credentials'}
                  {s === 'select-board' && 'Select Board'}
                  {s === 'configure' && 'Configure'}
                </StepLabel>
              </Step>
            )
          })}
        </Steps>

        {/* ── Error Banner ── */}
        {error && <ErrorBanner>{error}</ErrorBanner>}

        {/* ── Step 1: Credentials ── */}
        {step === 'credentials' && (
          <Form>
            <InfoPanel>
              <h3>Connect Trello in 3 quick steps</h3>
              <GuideList>
                <li>Open your Trello API key page and copy the API key value.</li>
                <li>Use that key to open Trello authorization in your browser.</li>
                <li>Approve access, copy the token Trello shows, then paste it here.</li>
              </GuideList>
              <LinkRow>
                <ActionLink href="https://trello.com/app-key" target="_blank" rel="noreferrer">
                  Open Trello API key page
                </ActionLink>
                <ActionLink
                  $disabled={!normalizedApiKey}
                  href={normalizedApiKey ? authorizeUrl : undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!normalizedApiKey}
                  onClick={(event) => {
                    if (!normalizedApiKey) {
                      event.preventDefault()
                      setError('Paste your API key first, then open browser authorization.')
                    }
                  }}
                >
                  Open Trello authorization
                </ActionLink>
              </LinkRow>
            </InfoPanel>

            <TipBox>
              If you copied a link like <code>trello.com/power-ups/.../edit/api-key</code> that is
              only the settings page. You need the API key value shown on that page, plus a token
              generated after approving access.
            </TipBox>

            <Label>
              Trello API Key
              <input
                type="text"
                placeholder="Paste the API key value"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </Label>
            <Label>
              Trello API Token
              <input
                type="password"
                placeholder="Paste the token shown after browser approval"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                autoComplete="off"
              />
            </Label>
            <Hint>
              Prefer the classic Trello page instead? Open{' '}
              <a href="https://trello.com/app-key" target="_blank" rel="noreferrer">
                trello.com/app-key
              </a>
              , then use the token link shown there after signing in.
            </Hint>
            <Actions>
              <button className="btn-primary" onClick={handleFetchBoards} disabled={loading}>
                {loading ? 'Connecting…' : 'Connect and load boards →'}
              </button>
            </Actions>
          </Form>
        )}

        {/* ── Step 2: Select Board ── */}
        {step === 'select-board' && (
          <Form>
            <Hint>
              {boards.length} board{boards.length !== 1 ? 's' : ''} found. Select the one you want
              to register.
            </Hint>
            <BoardList>
              {boards.map((board) => (
                <BoardOption
                  key={board.id}
                  $selected={selectedBoardId === board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                >
                  <BoardName>{board.name}</BoardName>
                  {board.desc && <BoardDesc>{board.desc}</BoardDesc>}
                </BoardOption>
              ))}
            </BoardList>
            <Actions>
              <button className="btn-ghost" onClick={() => setStep('credentials')}>
                ← Back
              </button>
              <button
                className="btn-primary"
                onClick={handleSelectBoard}
                disabled={!selectedBoardId}
              >
                Next →
              </button>
            </Actions>
          </Form>
        )}

        {/* ── Step 3: Configure ── */}
        {step === 'configure' && (
          <Form>
            <Hint>Optionally set a project code for JIRA-style ticket numbering.</Hint>
            <Label>
              Project Code <Optional>(optional, 3 uppercase letters, e.g. AGI)</Optional>
              <input
                type="text"
                placeholder="AGI"
                maxLength={3}
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
              />
            </Label>
            <Label>
              &quot;Done&quot; List Names <Optional>(comma-separated, e.g. Done, Shipped)</Optional>
              <input
                type="text"
                placeholder="Done"
                value={doneListNames}
                onChange={(e) => setDoneListNames(e.target.value)}
              />
            </Label>
            <Actions>
              <button className="btn-ghost" onClick={() => setStep('select-board')}>
                ← Back
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : '✓ Save Board'}
              </button>
            </Actions>
          </Form>
        )}
      </Card>
    </Container>
  )
}
