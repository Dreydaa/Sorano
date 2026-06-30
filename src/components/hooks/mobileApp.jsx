import { useEffect, useRef, useState } from 'react'
import initMobileScene from '../javascript/mobileThree'
import { useAudioPlayer } from './useAudioPlayer'
import CoverArtBackground from './coverArtBackground'
import MobilePlayer from './miniPlayer'
import '../styles/miniPlayer.css' // Ajuste le chemin selon ton arborescence

function MobileApp() {
  const canvasRef = useRef(null)
  const [showBack, setShowBack] = useState(false)

  const playerProps = useAudioPlayer()
  const {
    currentCoverArt,
    currentBgPosition,
    showCoverArt,
    setShowCoverArt,
    currentTrack,
    handleNext,
    handlePrevious,
    isPlaying,
    setIsPlaying,
    audioRef,
  } = playerProps

  useEffect(() => {
    if (!canvasRef.current) return

    const cleanup = initMobileScene(canvasRef.current, {
      onTrackChange: (index, direction) => {
        setShowCoverArt(true)
        setShowBack(true)

        if (!isPlaying) {
          setIsPlaying(true)
          audioRef.current?.play().catch(console.error)
        }

        // Sync React → 3D pour les autres listeners éventuels
        window.dispatchEvent(new CustomEvent('trackChanged', {
          detail: { cubeIndex: index, direction }
        }))
      }
    })

    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = () => {
    setShowBack(false)
    setShowCoverArt(false)
  }

  // Wrapper handleNext/Previous pour sync avec la scène 3D
  const wrappedHandleNext = () => {
    const newIndex = handleNext()
    window.dispatchEvent(new CustomEvent('trackChanged', {
      detail: { cubeIndex: newIndex, direction: 1 }
    }))
    setShowBack(true)
  }

  const wrappedHandlePrevious = () => {
    const newIndex = handlePrevious()
    window.dispatchEvent(new CustomEvent('trackChanged', {
      detail: { cubeIndex: newIndex, direction: -1 }
    }))
    setShowBack(true)
  }

  return (
    <>
      <canvas ref={canvasRef} className="webgl" />

      <CoverArtBackground
        key={currentTrack?.id}
        coverArt={currentCoverArt}
        backgroundPosition={currentBgPosition}
        isVisible={showCoverArt}
        onClose={() => {}}
      />

      {showCoverArt && (
        <MobilePlayer
          playerProps={{
            ...playerProps,
            handleNext: wrappedHandleNext,
            handlePrevious: wrappedHandlePrevious,
          }}
          showBack={showBack}
          onBack={handleBack}
        />
      )}
    </>
  )
}

export default MobileApp