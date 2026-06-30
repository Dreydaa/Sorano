import tracksData from '../data/TracksData.json';

// Générer la playlist avec les chemins locaux du dossier public
const generatePlaylist = () => {
  return tracksData.map(track => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    // Les chemins pointent désormais directement vers le dossier public
    audioSrc: track.audio,
    coverArt: track.coverart,
    backgroundPosition: track.backgroundPosition || 'center',
    cubeIndex: track.id,
    scrollText: track.scrollText || false,
    textColor: track.textColor || '#ffffff'
  }));
};


export const playlist = generatePlaylist();

export const getCubeTrack = (cubeIndex) => {
  return playlist.find(track => track.cubeIndex === cubeIndex);
};

export const getTrackById = (id) => {
  return playlist.find(track => track.id === id);
};

if (import.meta.env.DEV) {
  console.log('📀 Premier track chargé:', playlist[0]);
}