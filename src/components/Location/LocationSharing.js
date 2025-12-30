import React, { useState } from 'react';
import LocationModal from './LocationModal';
import { useSocket } from '../../utils/socket';

const LocationSharing = ({ currentGroup, currentUser }) => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isSharingLive, setIsSharingLive] = useState(false);
  const socket = useSocket();

  const shareLocation = (duration = null) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };

          if (socket) {
            if (duration) {
              // Live location sharing
              socket.emit('share_location', {
                location,
                duration,
                groupId: currentGroup?._id
              });
              setIsSharingLive(true);
              
              // Auto stop after duration
              setTimeout(() => {
                stopSharing();
              }, duration * 60 * 1000);
            } else {
              // One-time location share
              socket.emit('send_message', {
                type: 'location',
                location,
                content: '📍 Shared my location',
                groupId: currentGroup?._id
              });
            }
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const stopSharing = () => {
    setIsSharingLive(false);
    if (socket) {
      socket.emit('stop_sharing_location', {
        groupId: currentGroup?._id
      });
    }
  };

  return (
    <>
      <button 
        className="location-btn"
        onClick={() => setShowLocationModal(true)}
        title="Share Location"
      >
        <i className="fas fa-map-marker-alt"></i>
      </button>

      {isSharingLive && (
        <div className="location-sharing-active">
          <i className="fas fa-satellite-dish"></i>
          <span>Sharing live location</span>
          <button 
            className="stop-sharing-btn"
            onClick={stopSharing}
          >
            Stop
          </button>
        </div>
      )}

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onShareLocation={() => {
          shareLocation();
          setShowLocationModal(false);
        }}
        onShareLiveLocation={(duration) => {
          shareLocation(duration);
          setShowLocationModal(false);
        }}
      />
    </>
  );
};

export default LocationSharing;