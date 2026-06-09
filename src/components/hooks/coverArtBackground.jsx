import React from 'react';
import '../styles/coverArtBackground.css';
import { useEffect } from 'react';

const CoverArtBackground = ({ coverArt, backgroundPosition = 'center', isVisible, onClose }) => {

// Effet pour bloquer et débloquer le scroll global
  useEffect(() => {
    if (isVisible && coverArt) {
      // On sauvegarde le style d'origine au cas où
      const originalStyle = window.getComputedStyle(document.body).overflow;
      
      // On bloque le scroll
      document.body.style.overflow = 'hidden';

      // Nettoyage : quand le composant se ferme ou s'annule, on remet le scroll
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isVisible, coverArt]); // Se déclenche dès que la visibilité change


  if (!isVisible || !coverArt) return null;

  // Fonction pour convertir la position en valeur CSS valide
  const getBackgroundPosition = () => {
    switch (backgroundPosition) {
      case 'top':
        return 'top center';
      case 'bottom':
        return 'bottom center';
      case 'center':
      default:
        return 'center';
    }
  };

  const bgPosition = getBackgroundPosition();

  return (
    <div className="coverart-overlay" onClick={onClose}>
      <div 
        className="coverart-blur-bg"
        style={{ 
           backgroundImage: `url(${coverArt})`,
          backgroundPosition: bgPosition,
          backgroundSize: 'cover', // Changé de 'cover' à 'contain'
          backgroundRepeat: 'no-repeat',
        }}
      />  
    </div>
  );
};

export default CoverArtBackground;