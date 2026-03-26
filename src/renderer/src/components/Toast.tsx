import { useEffect } from 'react'
import styles from './Toast.module.css'

interface Props {
  message: string | null
  onDismiss: () => void
}

export default function Toast({ message, onDismiss }: Props): JSX.Element | null {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className={styles.toast} role="alert">
      <span className={styles.toastMessage}>{message}</span>
      <button className={styles.toastClose} onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
