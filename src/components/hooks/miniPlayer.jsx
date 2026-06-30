import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2 } from 'lucide-react';

const MiniPlayer = ({ playerProps }) => {
  const {
    showBack,
    handleBack,
    isPlaying,
    currentTime,
    duration,
    currentTrack,
    shuffle,
    repeat,
    togglePlay,
    handleNext,
    handlePrevious,
    toggleShuffle,
    toggleRepeat,
    audioRef,
    showCoverArt // 👈 On récupère la variable qui passe à true lors du clic sur un cube
  } = playerProps;

  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [volumePercent, setVolumePercent] = useState(5);

  const volumeRef = useRef(null);
  const volumeTrackRef = useRef(null);
  const progressBarRef = useRef(null);
  const isDraggingVolume = useRef(false);

  const formatTime = (time) => {
    if (isNaN(time) || time === undefined) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volumePercent / 100;
    }
  }, [volumePercent, audioRef]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target)) {
        setIsVolumeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateVolumeFromEvent = (e) => {
    if (!volumeTrackRef.current) return;
    const rect = volumeTrackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const nextPercent = Math.max(0, Math.min(100, 100 - (clickY / rect.height) * 100));
    setVolumePercent(Math.round(nextPercent));
  };

  const handleVolumeDragStart = (e) => {
    e.preventDefault();
    isDraggingVolume.current = true;
    updateVolumeFromEvent(e);

    const handleMouseMove = (moveEvent) => {
      if (isDraggingVolume.current) updateVolumeFromEvent(moveEvent);
    };

    const handleMouseUp = () => {
      isDraggingVolume.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleProgressClick = (e) => {
    if (!progressBarRef.current || !duration || !audioRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const nextPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    audioRef.current.currentTime = (nextPercent / 100) * duration;
  };
  
  return (
    <>
    {showBack && (
        <button
          className="back-btn"
          onClick={handleBack}
        >
          ← Back
        </button>
      )}
      {/* ⚡ Ajout de la classe dynamique --visible selon l'état de showCoverArt */}
      <section className={`music-player ${showCoverArt ? 'music-player--visible' : ''}`}>
        <header className="music-player__header">
          {/* On applique la classe de scroll dynamiquement selon le morceau actuel */}
          <div className={`music-player__title-track ${currentTrack?.scrollText ? 'music-player__title-track--scroll' : ''}`}>

            <h1 className="music-player__title" style={{ color: currentTrack?.textColor || '#ffffff' }}>
              <span>{currentTrack?.title || "Sélectionnez un titre"}</span>
              <span> - </span>
              <span>{currentTrack?.artist || "Artiste inconnu"}</span>
              {/* Petit espace invisible à la fin du texte pour séparer les boucles */}
              {currentTrack?.scrollText && <span className="music-player__title-spacer">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>}
            </h1>

            {/* Si scrollText est true, on duplique le texte pour créer la transition infinie */}
            {currentTrack?.scrollText && (
              <h1 className="music-player__title" aria-hidden="true" style={{ color: currentTrack?.textColor || '#ffffff' }}>
                <span>{currentTrack?.title || "Sélectionnez un titre"}</span>
                <span> - </span>
                <span>{currentTrack?.artist || "Artiste inconnu"}</span>
                <span className="music-player__title-spacer">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              </h1>
            )}

          </div>
        </header>

        <div className="music-player__progress-container">
          <time className="music-player__time">{formatTime(currentTime)}</time>
          <div
            className="music-player__progress-bar"
            ref={progressBarRef}
            onClick={handleProgressClick}
            style={{ cursor: 'pointer' }}
          >
            <div className="music-player__progress-bg"></div>
            <div className="music-player__progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <time className="music-player__time">{formatTime(duration)}</time>
        </div>

        <nav className="music-player__controls" aria-label="Music player controls">
          <div className="music-player__controls-group">

            <button
              className={`music-player__btn music-player__btn--repeat ${repeat ? 'music-player__btn--active' : ''}`}
              aria-pressed={repeat}
              aria-label="Toggle repeat"
              onClick={toggleRepeat}
            >
              <Repeat size={24} strokeWidth={2}/>
            </button>

            <div className="music-player__controls-center">
              <button
                className="music-player__btn music-player__btn--skip"
                aria-label="Previous track"
                onClick={handlePrevious}
              >
                <SkipBack size={48} strokeWidth={2} />
              </button>

              <button
                className="music-player__btn music-player__btn--play"
                aria-pressed={isPlaying}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause size={64} strokeWidth={1.5} />
                ) : (
                  <Play size={64} strokeWidth={1.5} />
                )}
              </button>

              <button
                className="music-player__btn music-player__btn--skip"
                aria-label="Next track"
                onClick={handleNext}
              >
                <SkipForward size={48} strokeWidth={2} />
              </button>
            </div>

            <button
              className={`music-player__btn music-player__btn--shuffle ${shuffle ? 'music-player__btn--active' : ''}`}
              aria-pressed={shuffle}
              aria-label="Toggle shuffle"
              onClick={toggleShuffle}
            >
              <Shuffle size={24} strokeWidth={2}/>
            </button>

          </div>
        </nav>
      </section>

      {/* ⚡ Ajout de la classe dynamique --visible aussi pour le bouton de volume indépendant */}
      <div className={`music-player__volume-container ${showCoverArt ? 'music-player__volume-container--visible' : ''}`} ref={volumeRef}>
        <button
          className="music-player__btn music-player__btn--volume"
          aria-label="Volume"
          onClick={() => setIsVolumeOpen(!isVolumeOpen)}
        >
          <Volume2 size={24} />
        </button>

        <div className={`music-player__volume-popup ${isVolumeOpen ? 'music-player__volume-popup--open' : ''}`}>
          <div className="music-player__volume-slider">
            <div
              className="music-player__volume-track"
              ref={volumeTrackRef}
              onClick={updateVolumeFromEvent}
              onMouseDown={handleVolumeDragStart}
              style={{ cursor: 'pointer' }}
            >
              <div className="music-player__volume-fill" style={{ height: `${volumePercent}%` }}></div>
              <div
                className="music-player__volume-handle"
                style={{ bottom: `${volumePercent}%` }}
              ></div>
            </div>
          </div>
          <div className="music-player__volume-label">{volumePercent}%</div>
        </div>
      </div>
    </>
  );
};

export default MiniPlayer;