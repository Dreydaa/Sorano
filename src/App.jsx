import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useDeviceDetect } from './components/hooks/useDeviceDetect'
import './components/styles/App.css'
import './components/styles/miniPlayer.css'
import './components/styles/Loadingscreen.css'
import initScene from './components/javascript/three'
import { useAudioPlayer } from './components/hooks/useAudioPlayer'
import CoverArtBackground from './components/hooks/coverArtBackground'
import { playlist } from './components/hooks/Playlistdata'
import MiniPlayer from './components/hooks/miniPlayer'
import LoadingScreen from './components/hooks/Loadingscreen'
import gsap from 'gsap'

const MobileApp = lazy(() => import('./components/hooks/mobileApp'))

function DesktopApp() {
  const canvasRef = useRef(null)
  const playerRef = useRef(null)
  const [showBack, setShowBack] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const playerProps = useAudioPlayer()
  const {
    showCoverArt,
    currentCoverArt,
    currentBgPosition,
    currentTrack,
    playTrackByCubeIndex,
    setShowCoverArt,
  } = playerProps

  const playTrackRef = useRef(playTrackByCubeIndex)
  useEffect(() => { playTrackRef.current = playTrackByCubeIndex }, [playTrackByCubeIndex])

  useEffect(() => {
    const onLock = () => setShowBack(true)
    window.addEventListener('scrollLocked', onLock)
    return () => window.removeEventListener('scrollLocked', onLock)
  }, [])

  useEffect(() => {
    if (showCoverArt && playerRef.current) {
      gsap.fromTo(playerRef.current,
        { y: 80, opacity: 0, scale: 0.92, filter: 'blur(8px)' },
        { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out', delay: 0.1 }
      )
    }
  }, [showCoverArt])

  const handleBack = () => {
    setShowBack(false)
    setShowCoverArt(false)
    window.dispatchEvent(new CustomEvent('scrollUnlocked'))
  }

  useEffect(() => {
    if (!canvasRef.current) return
    const cleanup = initScene(canvasRef.current, {
      playlist,
      onCubeClick: (cubeIndex) => {
        if (playTrackRef.current) playTrackRef.current(cubeIndex)
      },
      onLoaded: () => {
        setIsLoading(false)
      }
    })
    return cleanup
  }, [])

  const extendedPlayerProps = { ...playerProps, handleBack, showBack }

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      <canvas ref={canvasRef} className="webgl" />

      <img className='sorano' src='Sorano-preview.webp' alt='Sorano Logo' />

      <div className='contact-container'>
        <a className='button' href='https://www.linkedin.com/in/alan-bultel-8a5a93258' target='_blank'>
          <span>Contact me</span>
        </a>
      </div>

      <CoverArtBackground
        key={currentTrack?.id}
        coverArt={currentCoverArt}
        backgroundPosition={currentBgPosition}
        isVisible={showCoverArt}
        onClose={() => setShowCoverArt(false)}
      />

      {showCoverArt && (
        <MiniPlayer playerProps={extendedPlayerProps} />
      )}
    </>
  )
}

function App() {
  const { isMobileOrTablet } = useDeviceDetect()
  return isMobileOrTablet ? (
    <Suspense fallback={null}>
      <MobileApp />
    </Suspense>
  ) : (
    <DesktopApp />
  )
}


export default App