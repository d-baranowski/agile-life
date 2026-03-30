import type { TemplateGroup, TicketTemplate, GenerateCardsResult } from '@shared/template.types'
import { resolvePlaceholders } from '../../lib/placeholders'
import styles from '../KanbanPage.module.css'

interface Props {
  groups: TemplateGroup[]
  groupId: number | null
  templates: TicketTemplate[]
  loading: boolean
  generating: boolean
  result: GenerateCardsResult | null
  error: string | null
  onGroupChange: (groupId: number) => void
  onGenerate: () => void
  onClose: () => void
}

export default function GenerateTemplateModal({
  groups,
  groupId,
  templates,
  loading,
  generating,
  result,
  error,
  onGroupChange,
  onGenerate,
  onClose
}: Props): JSX.Element {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.genModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.genModalHeader}>
          <h2 className={styles.genModalTitle}>📋 Generate from Template</h2>
          <button className={styles.modalClose} onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>

        <div className={styles.genModalBody}>
          {groups.length === 0 ? (
            <p className={styles.genEmptyState}>
              No template groups found for this board. Create groups in the Templates tab first.
            </p>
          ) : (
            <>
              <div className={styles.genGroupRow}>
                <label className={styles.genLabel}>Template group</label>
                <select
                  className={styles.genSelect}
                  value={groupId ?? ''}
                  onChange={(e) => onGroupChange(Number(e.target.value))}
                >
                  <option value="">— Select a group —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {groupId !== null && (
                <div className={styles.genPreview}>
                  <div className={styles.genPreviewTitle}>Preview</div>
                  {loading ? (
                    <div className={styles.genPreviewLoading}>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      <span>Loading…</span>
                    </div>
                  ) : templates.length === 0 ? (
                    <p className={styles.genEmptyState}>
                      This group has no templates. Add templates in the Templates tab.
                    </p>
                  ) : (
                    <ul className={styles.genPreviewList}>
                      {templates.map((t) => (
                        <li key={t.id} className={styles.genPreviewItem}>
                          <span className={styles.genPreviewCardTitle}>
                            {resolvePlaceholders(t.titleTemplate, new Date())}
                          </span>
                          <span className={styles.genPreviewMeta}>→ {t.listName}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {result && (
                <div
                  className={`${styles.genResultBanner} ${result.failed === 0 ? styles.genResultSuccess : styles.genResultError}`}
                >
                  {result.created} card{result.created !== 1 ? 's' : ''} created
                  {result.failed > 0 && `, ${result.failed} failed`}.
                  {result.errors.length > 0 && (
                    <ul className={styles.genResultErrors}>
                      {result.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {error && (
                <div className={`${styles.genResultBanner} ${styles.genResultError}`}>{error}</div>
              )}
            </>
          )}
        </div>

        <div className={styles.genModalFooter}>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {groups.length > 0 && (
            <button
              className="btn-primary"
              onClick={onGenerate}
              disabled={groupId === null || templates.length === 0 || loading || generating}
            >
              {generating ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  Generating…
                </span>
              ) : (
                '▶ Generate cards'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
