// config.js - Configuration audio selon l'environnement

const isDev = import.meta.env.DEV; // Vite détecte automatiquement

export const AUDIO_CONFIG = {
  // En développement : audio local
  // En production : Cloudflare R2
  audioBaseUrl: isDev 
    ? '/audio'  // Local: public/audio/
    : 'https://pub-votre-id.r2.dev', // Prod: R2
  
  // Covers toujours en local
  coverBaseUrl: '/covers'
};

// Helper pour construire les URLs
export const getAudioUrl = (trackNumber) => {
  const num = String(trackNumber).padStart(3, '0');
  return `${AUDIO_CONFIG.audioBaseUrl}/track-${num}.mp3`;
};

export const getCoverUrl = (trackNumber) => {
  const num = String(trackNumber).padStart(3, '0');
  return `${AUDIO_CONFIG.coverBaseUrl}/cover-${num}.jpg`;
};