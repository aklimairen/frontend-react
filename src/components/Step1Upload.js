import React, { useState, useRef } from 'react';
import axios from 'axios';
import SampleDataSelector from './SampleDataSelector';
import { BsFillInfoCircleFill } from "react-icons/bs";

const API_URL = 'http://localhost:5000';

function Step1Upload({ onFileUpload, onGoToStep2, fileInfo, configData, onConfigChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        onFileUpload(file, response.data);
      } else {
        setError(response.data.error);
      }
    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running on port 5000.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handler for sample data selection (now uses real backend upload)
  const handleSampleSelect = (file, backendResponse) => {
    console.log('Sample selected and uploaded:', file.name);
    // Backend has already uploaded, just pass the response
    onFileUpload(file, backendResponse);
    setError(null);
  };

  // Handler for config updates from sample selector
  const handleConfigUpdate = (newConfig) => {
    console.log('Config updated:', newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="step-container">
      <h2 className="step-title">Step 1: Data Ingestion & Preprocessing</h2>
      <p className="step-description">
        Upload your dataset and configure basic preprocessing parameters before extracting features.
      </p>

      {/* Sample Data Selector */}
      <SampleDataSelector 
        onSampleSelect={handleSampleSelect}
        onConfigUpdate={handleConfigUpdate}
      />

      {/* Upload Area */}
      <div className="form-group">
        <label className="form-label">
          Upload Your Dataset
          <span className="info-icon" title="Upload CSV, TXT, TSV, Excel, JSON, or Parquet files"><BsFillInfoCircleFill /></span>
        </label>
        
        <div
          className={`upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,.xlsx,.xls,.json,.parquet"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          {isUploading ? (
            <p className="upload-text">Uploading...</p>
          ) : (
            <>
              <p className="upload-text">Click to upload or drag and drop</p>
              <p className="upload-hint">CSV, TXT, TSV, Excel, JSON, Parquet (MAX. 50MB)</p>
            </>
          )}
        </div>

        {/* File Info */}
        {fileInfo && (
          <div className="file-info">
            <p className="file-info-title">✓ File uploaded successfully</p>
            <p className="file-info-text">File: {fileInfo.filename}</p>
            <p className="file-info-text">
              {fileInfo.rows} rows × {fileInfo.columns.length} columns
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            border: '1px solid #fca5a5', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            marginTop: '1rem',
            color: '#991b1b'
          }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* Sampling Frequency */}
      <div className="form-group">
        <label className="form-label">
          Sampling Frequency (Hz)
          <span className="info-icon" title="The rate at which data points were collected"><BsFillInfoCircleFill /></span>
        </label>
        <input
          type="number"
          className="form-input"
          value={configData.samplingFreq}
          onChange={(e) => onConfigChange({ samplingFreq: parseInt(e.target.value) })}
          placeholder="e.g., 50"
        />
      </div>

      {/* Data Cleaning Options */}
      <div className="form-group">
        <label className="form-label">
          Data Cleaning Options
          <span className="info-icon" title="Select preprocessing steps"><BsFillInfoCircleFill /></span>
        </label>
        <div className="checkbox-group">
          <label className="checkbox-item">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={configData.handleMissing}
              onChange={(e) => onConfigChange({ handleMissing: e.target.checked })}
            />
            <span className="checkbox-label">Handle Missing Values</span>
          </label>

          <label className="checkbox-item">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={configData.normalize}
              onChange={(e) => onConfigChange({ normalize: e.target.checked })}
            />
            <span className="checkbox-label">Normalize Data</span>
          </label>

          <label className="checkbox-item">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={configData.noiseReduction}
              onChange={(e) => onConfigChange({ noiseReduction: e.target.checked })}
            />
            <span className="checkbox-label">Noise Reduction (Filter)</span>
          </label>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={onGoToStep2}
        disabled={!fileInfo}
      >
        Go to Step 2 →
      </button>
    </div>
  );
}

export default Step1Upload;