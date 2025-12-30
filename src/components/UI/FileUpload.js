import React, { useState, useRef } from 'react';

const FileUpload = ({ onFileSelect, multiple = false }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className={`file-upload-container ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple={multiple}
        style={{ display: 'none' }}
      />
      
      <button 
        className="file-upload-btn"
        onClick={() => fileInputRef.current?.click()}
      >
        <i className="fas fa-cloud-upload-alt"></i>
        <span>Upload Files</span>
      </button>
      
      {dragActive && (
        <div className="drag-overlay">
          <i className="fas fa-cloud-upload-alt"></i>
          <p>Drop files here</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;