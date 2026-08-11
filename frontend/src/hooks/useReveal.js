import { useEffect, useRef, useState } from 'react'

// Fades/slides a section in the first time it scrolls into view — reveals
// once and stays, doesn't re-trigger on scroll-away (that'd be distracting,
// not "eye-catching").
export function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, visible]
}
