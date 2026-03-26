/**
 * react-beautiful-dnd's Droppable component does not work inside React 18
 * StrictMode because StrictMode double-invokes effects, which breaks the
 * internal drag state. This wrapper delays rendering until after the first
 * animation frame so the Droppable mounts correctly.
 *
 * See: https://github.com/atlassian/react-beautiful-dnd/issues/2396
 */
import { useEffect, useState } from 'react'
import { Droppable, DroppableProps } from 'react-beautiful-dnd'

export default function StrictModeDroppable({ children, ...props }: DroppableProps): JSX.Element {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(raf)
      setEnabled(false)
    }
  }, [])

  if (!enabled) {
    return <></>
  }

  return <Droppable {...props}>{children}</Droppable>
}
