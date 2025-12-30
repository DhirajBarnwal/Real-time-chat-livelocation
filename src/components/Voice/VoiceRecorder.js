// [file name]: VoiceRecorder.js

import React, { useState, useRef, useEffect } from 'react';

const VoiceRecorder = ({ onSendVoiceMessage, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimer();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Please allow microphone access to record voice messages.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (audioBlob) {
      onSendVoiceMessage(audioBlob);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl('');
      }
      onClose();
    }
  };

  const handleCancel = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }
    onClose();
  };

  return (
    <div className="voice-recorder-modal">
      <div className="voice-recorder-content">
        <div className="recorder-header">
          <h3><i className="fas fa-microphone"></i> Voice Message</h3>
          <button className="close-recorder" onClick={handleCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="recorder-body">
          {!audioBlob ? (
            <div className="recording-section">
              <div className={`recording-indicator ${isRecording ? 'active' : ''}`}>
                <div className="recording-animation">
                  <div className="wave wave1"></div>
                  <div className="wave wave2"></div>
                  <div className="wave wave3"></div>
                </div>
                <div className="recording-icon">
                  <i className="fas fa-microphone"></i>
                </div>
              </div>
              
              <div className="recording-time">
                {isRecording ? formatTime(recordingTime) : '00:00'}
              </div>
              
              <div className="recording-controls">
                {!isRecording ? (
                  <button 
                    className="record-btn start"
                    onClick={startRecording}
                  >
                    <i className="fas fa-circle"></i> Start Recording
                  </button>
                ) : (
                  <button 
                    className="record-btn stop"
                    onClick={stopRecording}
                  >
                    <i className="fas fa-stop"></i> Stop Recording
                  </button>
                )}
              </div>
              
              <div className="recording-instructions">
                <p><i className="fas fa-info-circle"></i> Click to start recording</p>
                <p><i className="fas fa-clock"></i> Maximum recording time: 5 minutes</p>
              </div>
            </div>
          ) : (
            <div className="playback-section">
              <div className="audio-player">
                <audio src={audioUrl} controls className="audio-element" />
              </div>
              
              <div className="audio-duration">
                <i className="fas fa-clock"></i>
                <span>{formatTime(recordingTime)}</span>
              </div>
              
              <div className="playback-controls">
                <button className="btn-secondary" onClick={handleCancel}>
                  <i className="fas fa-trash"></i> Discard
                </button>
                <button className="btn-primary" onClick={handleSend}>
                  <i className="fas fa-paper-plane"></i> Send Voice Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorder;
