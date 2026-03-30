import { useEffect } from 'react'
import { ToastCloseButton, ToastLogsButton, ToastMessage, ToastWrapper } from './toast.styled'

interface Props {
  message: string | null
  onDismiss: () => void
  onOpenLogs?: () => void
  variant?: 'error' | 'success'
}

export default function Toast(props: Props): JSX.Element | null {
  const { message, onDismiss, onOpenLogs, variant = 'error' } = props

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <ToastWrapper $success={variant === 'success'} role="alert">
      <ToastMessage>{message}</ToastMessage>
      {onOpenLogs && (
        <ToastLogsButton onClick={onOpenLogs} aria-label="Open log folder">
          📂 Logs
        </ToastLogsButton>
      )}
      <ToastCloseButton onClick={onDismiss} aria-label="Dismiss">
        ✕
      </ToastCloseButton>
    </ToastWrapper>
  )
}
