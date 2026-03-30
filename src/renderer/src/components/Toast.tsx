import { useEffect } from 'react'
import styles from './Toast.module.css'

interface Props {
  message: string | null
  onDismiss: () => void
  onOpenLogs?: () => void
  variant?: 'error' | 'success'
}

export default function Toast({
  message,
  onDismiss,
  onOpenLogs,
  variant = 'error'
}: Props): JSX.Element | null {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      className={`${styles.toast} ${variant === 'success' ? styles.toastSuccess : ''}`}
      role="alert"
    >
      <span className={styles.toastMessage}>{message}</span>
      {onOpenLogs && (
        <button className={styles.toastLogsBtn} onClick={onOpenLogs} aria-label="Open log folder">
          📂 Logs
        </button>
      )}
      <button className={styles.toastClose} onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
