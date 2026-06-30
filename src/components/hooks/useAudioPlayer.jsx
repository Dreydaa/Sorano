import { useState, useEffect, useRef } from "react";
import { playlist, getCubeTrack } from "./Playlistdata"; // Attention à la majuscule si ton fichier s'appelle Playlistdata.jsx

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [showCoverArt, setShowCoverArt] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTextColor, setCurrentTextColor] = useState('#ffffff')

  const [prevTrackIndex, setPrevTrackIndex] = useState(0);

  const audioRef = useRef(new Audio());

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

// A. Calcul en temps réel de la position (État dérivé)
  const currentBgPosition = playlist[currentTrackIndex]?.backgroundPosition || "center";

  // B. Synchronisation de la cover (Méthode recommandée par React pour éviter les rendus en cascade)
  if (currentTrackIndex !== prevTrackIndex) {
    setPrevTrackIndex(currentTrackIndex);
    setShowCoverArt(true);
  }

  // C. Effet secondaire pur : Notifier la scène externe Three.js (Zéro setState ici !)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('trackChanged', { detail: { cubeIndex: currentTrackIndex } })
    );
  }, [currentTrackIndex]);

  useEffect(() => {
    const audio = audioRef.current;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    const handleEnded = () => {
      if (repeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setCurrentTrackIndex((prev) => {
          if (shuffle) {
            let randomIndex;
            do {
              randomIndex = Math.floor(Math.random() * playlist.length);
            } while (randomIndex === prev && playlist.length > 1);
            return randomIndex;
          } else {
            return (prev + 1) % playlist.length;
          }
        });
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [repeat, shuffle, playlist.length]);

  useEffect(() => {
    let animationFrameId;
    const updateProgress = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (playlist.length > 0 && playlist[currentTrackIndex]?.audioSrc) {
      const currentTrack = playlist[currentTrackIndex];

      audioRef.current.src = currentTrack.audioSrc;

      if (isPlaying) {
        audioRef.current
          .play()
          .catch((e) => console.error("Playback failed:", e));
      }
    }
  }, [currentTrackIndex, playlist]);

  const getRandomTrackIndex = () => {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * playlist.length);
    } while (randomIndex === currentTrackIndex && playlist.length > 1);
    return randomIndex;
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current
        .play()
        .catch((e) => console.error("Playback failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
  let newIndex;
  if (shuffle) {
    do {
      newIndex = Math.floor(Math.random() * playlist.length);
    } while (newIndex === currentTrackIndex && playlist.length > 1);
  } else {
    newIndex = (currentTrackIndex + 1) % playlist.length;
  }
  setCurrentTextColor(playlist[newIndex]?.textColor || '#ffffff') // ← fix newTrack
  setCurrentTrackIndex(newIndex);
  return newIndex;
};

const handlePrevious = () => {
  let newIndex;
  if (shuffle) {
    do {
      newIndex = Math.floor(Math.random() * playlist.length);
    } while (newIndex === currentTrackIndex && playlist.length > 1);
  } else {
    newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
  }
  setCurrentTextColor(playlist[newIndex]?.textColor || '#ffffff') // ← fix newTrack
  setCurrentTrackIndex(newIndex);
  return newIndex;
};

  const handleTimeUpdate = (e) => {
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const playTrackByCubeIndex = (cubeIndex) => {
    const track = getCubeTrack(cubeIndex);
    if (track) {
      setCurrentTrackIndex(track.id);
      setShowCoverArt(track.coverArt);
      setShowCoverArt(true);
      if (!isPlaying) {
        setIsPlaying(true);
        audioRef.current
          .play()
          .catch((e) => console.error("Playback failed:", e));
      }
      setCurrentTextColor(track.textColor || '#ffffff')
    }
  };

  const hideCoverArt = () => setShowCoverArt(false);
  const toggleShuffle = () => setShuffle(!shuffle);
  const toggleRepeat = () => setRepeat(!repeat);

  return {
    isPlaying,
    currentTime,
    setCurrentTextColor,
    currentTextColor,
    duration,
    currentTrack: playlist[currentTrackIndex] || {},
    currentCoverArt: playlist[currentTrackIndex]?.coverArt, // <-- Correction ici
    currentBgPosition,
    showCoverArt,
    shuffle,
    repeat,
    togglePlay,
    handleNext,
    handlePrevious,
    handleTimeUpdate,
    toggleShuffle,
    toggleRepeat,
    playTrackByCubeIndex,
    hideCoverArt,
    setShowCoverArt,
    audioRef,
    playlist,
    volume,
    handleVolumeChange,
    getRandomTrackIndex,
  };
};
