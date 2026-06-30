import { useEffect, useState, useRef } from 'react'
import gsap from 'gsap'

const LoadingScreen = ({ isLoading }) => {
  const [elapsed, setElapsed] = useState(0)
  const screenRef = useRef(null)
  const startTimeRef = useRef(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    startTimeRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000)
    }, 50)
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (!isLoading && screenRef.current) {
      clearInterval(intervalRef.current)
      gsap.to(screenRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          if (screenRef.current) screenRef.current.style.display = 'none'
        }
      })
    }
  }, [isLoading])

  return (
    <div ref={screenRef} className="loading-screen">
      <div className="loading-screen__content">
        <div className="loading-screen__spinner" />
        <p className="loading-screen__text">Chargement de la scène</p>
        <p className="loading-screen__timer">{elapsed.toFixed(1)}s</p>
      </div>
    </div>
  )
}

export default LoadingScreen