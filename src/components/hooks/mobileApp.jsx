import { useEffect, useRef, useState } from 'react'
import initMobileScene from '../javascript/mobileThree'
import { useAudioPlayer } from './useAudioPlayer'
import CoverArtBackground from './coverArtBackground'
import MobilePlayer from './miniPlayer'
import '../styles/miniPlayer.css' // Ajuste le chemin selon ton arborescence
import '../styles/mobile.css' 

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
    // isPlaying,
    // setIsPlaying,
    // audioRef,
    playTrackByCubeIndex,
  } = playerProps

  useEffect(() => {
    if (!canvasRef.current) return

    const cleanup = initMobileScene(canvasRef.current, {
      onTrackChange: (index, direction) => {
        // Sync React → 3D pour les autres listeners éventuels, mais ne démarre PAS la musique
        window.dispatchEvent(new CustomEvent('trackChanged', {
          detail: { cubeIndex: index, direction }
        }))
      },
      onCubeClick: (index) => {
        // Le clic sur un modèle démarre la musique et affiche le player
        playTrackByCubeIndex(index)
        setShowCoverArt(true)
        setShowBack(true)
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

  // Swipe detection for Player Mode
  const [touchStartPos, setTouchStartPos] = useState(null)

  const onTouchStart = (e) => {
    // Ignore if touching the player controls
    if (e.target.closest('.music-player')) return
    setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
  }

  const onTouchEnd = (e) => {
    if (!touchStartPos) return
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    
    const dx = touchEndX - touchStartPos.x
    const dy = touchEndY - touchStartPos.y

    // Ignore if it's more vertical than horizontal, or if it's too short
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) {
        wrappedHandlePrevious() // Swipe right
      } else {
        wrappedHandleNext() // Swipe left
      }
    }
    setTouchStartPos(null)
  }

  return (
    <>
      <canvas 
        ref={canvasRef} 
        className="webgl" 
        style={{ 
          opacity: showCoverArt ? 0 : 1, 
          pointerEvents: showCoverArt ? 'none' : 'auto',
          transition: 'opacity 0.4s ease-in-out' 
        }} 
      />

      <img 
        className='sorano' 
        src='Sorano-preview.webp' 
        alt='Sorano Logo' 
        style={{ 
          opacity: showCoverArt ? 0 : 1, 
          pointerEvents: showCoverArt ? 'none' : 'auto', 
          transition: 'opacity 0.4s ease-in-out' 
        }} 
      />

      <div 
        className='contact-container'
        style={{ 
          opacity: showCoverArt ? 0 : 1, 
          pointerEvents: showCoverArt ? 'none' : 'auto', 
          transition: 'opacity 0.4s ease-in-out' 
        }} 
      >
        <a className='button' href='https://www.linkedin.com/in/alan-bultel-8a5a93258' target='_blank'>
          <span>Contact me</span>
        </a>
      </div>

      <CoverArtBackground
        key={currentTrack?.id}
        coverArt={currentCoverArt}
        backgroundPosition={currentBgPosition}
        isVisible={showCoverArt}
        onClose={() => {}}
      />

      {showCoverArt && (
        <div 
          className="mobile-player-overlay"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 40 }}
        >
          <div className="mobile-cover-image-container">
            <img 
              src={currentCoverArt} 
              alt={currentTrack?.title || "Cover"} 
              className="mobile-cover-image" 
            />
          </div>
          <MobilePlayer
            playerProps={{
              ...playerProps,
              handleNext: wrappedHandleNext,
              handlePrevious: wrappedHandlePrevious,
            }}
            showBack={showBack}
            onBack={handleBack}
          />
        </div>
      )}
    </>
  )
}

export default MobileApp