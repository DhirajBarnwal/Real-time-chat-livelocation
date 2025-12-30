import React, { useState, useEffect } from 'react';

const LocationModal = ({ 
  isOpen, 
  onClose, 
  onShareLocation, 
  onShareLiveLocation 
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const locationOptions = [
    {
      icon: 'fas fa-map-pin',
      title: 'Share Current Location',
      description: 'Send your current location as a one-time message',
      onClick: onShareLocation,
      color: '#008069'
    },
    {
      icon: 'fas fa-satellite-dish',
      title: 'Share Live Location (5 min)',
      description: 'Share your live location for 5 minutes',
      onClick: () => onShareLiveLocation(5),
      color: '#25D366'
    },
    {
      icon: 'fas fa-satellite',
      title: 'Share Live Location (15 min)',
      description: 'Share your live location for 15 minutes',
      onClick: () => onShareLiveLocation(15),
      color: '#FF9500'
    },
    {
      icon: 'fas fa-globe-americas',
      title: 'Share Live Location (1 hour)',
      description: 'Share your live location for 1 hour',
      onClick: () => onShareLiveLocation(60),
      color: '#5856D6'
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content location-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="fas fa-map-marker-alt"></i> Share Location</h3>
          <button className="close-modal" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="location-options">
            {locationOptions.map((option, index) => (
              <div 
                key={index}
                className="location-option"
                onClick={option.onClick}
                style={{ borderLeftColor: option.color }}
              >
                <div className="option-icon" style={{ backgroundColor: option.color }}>
                  <i className={option.icon}></i>
                </div>
                <div className="option-info">
                  <h4>{option.title}</h4>
                  <p>{option.description}</p>
                </div>
                <i className="fas fa-chevron-right option-arrow"></i>
              </div>
            ))}
          </div>
          
          {currentLocation && (
            <div className="current-location-info">
              <h4><i className="fas fa-info-circle"></i> Your Current Location</h4>
              <div className="location-coordinates">
                <div className="coord">
                  <span className="label">Latitude:</span>
                  <span className="value">{currentLocation.lat.toFixed(6)}</span>
                </div>
                <div className="coord">
                  <span className="label">Longitude:</span>
                  <span className="value">{currentLocation.lng.toFixed(6)}</span>
                </div>
              </div>
              <a 
                href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="view-map-link"
              >
                <i className="fas fa-external-link-alt"></i> View on Google Maps
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationModal;