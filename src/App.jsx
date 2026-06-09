import { useEffect, useRef } from 'react';
import './components/styles/App.css'; // Ajuste le chemin selon ton arborescence
import './components/styles/miniPlayer.css'; // Ajuste le chemin selon ton arborescence
import initScene from './components/javascript/three'; // Ajuste le chemin selon ton arborescence
import { useAudioPlayer } from './components/hooks/useAudioPlayer'; // Ajuste le chemin selon ton arborescence
import CoverArtBackground from './components/hooks/coverArtBackground'; // Ajuste le chemin selon ton arborescence
import { playlist } from './components/hooks/Playlistdata';
import MiniPlayer from './components/hooks/miniPlayer'; // Ajuste le chemin selon ton arborescence


function App() {  
  const canvasRef = useRef(null);

  const playerProps = useAudioPlayer();
  const { showCoverArt, currentCoverArt, currentBgPosition, currentTrack, playTrackByCubeIndex, setShowCoverArt } = playerProps;

  // 💡 L'astuce magique est ici : On stocke la fonction dans une référence.
  // Cela permet au canvas Three.js d'y accéder sans jamais provoquer de re-rendu de la scène.
  const playTrackRef = useRef(playTrackByCubeIndex);
  
  useEffect(() => {
    playTrackRef.current = playTrackByCubeIndex;
  }, [playTrackByCubeIndex]);
 
  // Initialiser la scène Three.js avec callback
  useEffect(() => {
    if (canvasRef.current) {
      const cleanup = initScene(canvasRef.current, {
        playlist: playlist,
        onCubeClick: (cubeIndex) => {
          console.log(`🎵 Cube ${cubeIndex} cliqué - Lancement de la musique`);
          // On appelle la fonction via la ref
          if (playTrackRef.current) {
            playTrackRef.current(cubeIndex);
          }
        }
      });
      
      return cleanup;
    }
  }, []); // <--- Le tableau vide est crucial. La scène ne se recharge plus !
 

 
  return (
    <>
      <canvas ref={canvasRef} className='webgl'></canvas>
      
      
      <CoverArtBackground 
        key={currentTrack?.id}
        coverArt={currentCoverArt}
        backgroundPosition={currentBgPosition}
        isVisible={showCoverArt}
        onClose={() => setShowCoverArt(false)}
      />
      
      {showCoverArt && (
        <MiniPlayer playerProps={playerProps} />
      )}
    </>
  );
}
 
export default App;