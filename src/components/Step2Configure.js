import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsFillInfoCircleFill, BsFillQuestionCircleFill } from "react-icons/bs";

const API_URL = 'http://localhost:5000';

// Signal type configurations with typical sampling frequencies and recommended domains
const SIGNAL_TYPES = {
  accelerometer: {
    label: 'Accelerometer / IMU (Motion Data)',
    description: 'Smartphone sensors, wearables, activity recognition',
    typicalFs: 50,
    fsRange: '20-200 Hz',
    recommendedDomains: ['temporal', 'statistical']
  },
  gyroscope: {
    label: 'Gyroscope (Rotation Data)',
    description: 'Angular velocity, orientation tracking',
    typicalFs: 50,
    fsRange: '20-200 Hz',
    recommendedDomains: ['temporal', 'statistical']
  },
  ecg: {
    label: 'ECG / Biomedical Signals',
    description: 'Heart rate, medical monitoring',
    typicalFs: 250,
    fsRange: '100-1000 Hz',
    recommendedDomains: ['temporal', 'spectral']
  },
  emg: {
    label: 'EMG (Muscle Activity)',
    description: 'Electromyography, muscle signals',
    typicalFs: 1000,
    fsRange: '500-2000 Hz',
    recommendedDomains: ['temporal', 'spectral', 'statistical']
  },
  audio: {
    label: 'Audio / Speech',
    description: 'Voice recordings, sound analysis',
    typicalFs: 16000,
    fsRange: '8000-44100 Hz',
    recommendedDomains: ['spectral']
  },
  environmental: {
    label: 'Environmental Sensors',
    description: 'Temperature, humidity, pressure',
    typicalFs: 1,
    fsRange: '0.01-10 Hz',
    recommendedDomains: ['statistical', 'temporal']
  },
  financial: {
    label: 'Financial / Stock Data',
    description: 'Price data, market indicators',
    typicalFs: 1,
    fsRange: '0.001-1 Hz',
    recommendedDomains: ['statistical', 'temporal']
  },
  other: {
    label: 'Other / Custom',
    description: 'I\'ll specify my own sampling frequency',
    typicalFs: 50,
    fsRange: 'Varies',
    recommendedDomains: ['temporal', 'statistical']
  }
};

function Step2Configure({ fileInfo, configData, onConfigChange, onBack, onExtractionComplete }) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [hasLabels, setHasLabels] = useState(false);
  const [selectedLabelColumn, setSelectedLabelColumn] = useState('');
  const [availableColumns, setAvailableColumns] = useState([]);
  const [signalType, setSignalType] = useState('accelerometer');
  const [showSignalHelp, setShowSignalHelp] = useState(false);

  // When file is uploaded, get all column names
  useEffect(() => {
    if (fileInfo && fileInfo.columns) {
      const nonNumericCols = fileInfo.columns.filter(col => 
        fileInfo.data_types[col] === 'object' || 
        fileInfo.data_types[col] === 'string' ||
        fileInfo.data_types[col] === 'O'
      );
      setAvailableColumns(nonNumericCols);
      
      if (configData.labelColumn) {
        setSelectedLabelColumn(configData.labelColumn);
        setHasLabels(true);
      }
    }
  }, [fileInfo, configData.labelColumn]);

  // Update sampling frequency when signal type changes
  const handleSignalTypeChange = (type) => {
    setSignalType(type);
    const signalConfig = SIGNAL_TYPES[type];
    
    // Update sampling frequency to typical value for this signal type
    onConfigChange({ 
      samplingFreq: signalConfig.typicalFs,
      signalType: type
    });
    
    // Optionally suggest recommended domains
    // Uncomment below if you want auto-selection of domains
    // onConfigChange({ domains: signalConfig.recommendedDomains });
  };

  const handleDomainChange = (domain, checked) => {
    let newDomains = [...configData.domains];
    
    if (checked) {
      newDomains.push(domain);
    } else {
      newDomains = newDomains.filter(d => d !== domain);
    }
    
    onConfigChange({ domains: newDomains });
  };

  const handleLabelChange = (checked) => {
    setHasLabels(checked);
    if (!checked) {
      setSelectedLabelColumn('');
      onConfigChange({ hasLabels: false, labelColumn: '' });
    } else {
      onConfigChange({ hasLabels: true });
    }
  };

  const handleLabelColumnChange = (column) => {
    setSelectedLabelColumn(column);
    onConfigChange({ labelColumn: column });
  };

  const handleRunExtraction = async () => {
    if (configData.domains.length === 0) {
      setError('Please select at least one feature domain');
      return;
    }

    if (!configData.samplingFreq || configData.samplingFreq <= 0) {
      setError('Please enter a valid sampling frequency');
      return;
    }

    setIsExtracting(true);
    setError(null);

    const extractionParams = {
      filename: fileInfo.filename,
      sampling_frequency: configData.samplingFreq,
      domains: configData.domains,
      handle_missing: configData.handleMissing,
      normalize: configData.normalize,
      window_size: configData.windowSize,
      overlap: configData.overlap / 100,
      label_column: selectedLabelColumn || null,
      signal_type: signalType
    };

    console.log('🚀 Starting extraction with params:', extractionParams);

    try {
      const response = await axios.post(`${API_URL}/extract`, extractionParams);

      if (response.data.success === true && response.data.features) {
        console.log('✅ Extraction succeeded!');
        onExtractionComplete(response.data);
      } else {
        setError(response.data.error || 'Extraction failed - no features returned');
      }
    } catch (err) {
      console.error('❌ Extraction error:', err);
      setError(err.response?.data?.error || 'Failed to extract features');
    } finally {
      setIsExtracting(false);
    }
  };

  const currentSignalConfig = SIGNAL_TYPES[signalType];

  return (
    <div className="step-container">
      <h2 className="step-title">Step 2: Configure Feature Extraction</h2>
      <p className="step-description">
        Customize feature extraction parameters for {fileInfo.filename}
      </p>

      {/* Signal Type Selection - Compact Section */}
      <div className="form-group" style={{ 
        backgroundColor: '#f8fafc', 
        padding: '1.25rem', 
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', margin: 0 }}>
            Signal Information
          </h3>
          <button
            type="button"
            onClick={() => setShowSignalHelp(!showSignalHelp)}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <BsFillQuestionCircleFill /> {showSignalHelp ? 'Hide help' : 'Why does this matter?'}
          </button>
        </div>

        {/* Help tooltip */}
        {showSignalHelp && (
          <div style={{
            backgroundColor: '#fefce8',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '0.75rem',
            fontSize: '0.8rem',
            color: '#854d0e',
            border: '1px solid #fde047'
          }}>
            <strong>Why Sampling Frequency Matters:</strong> Spectral features (FFT, Power Spectrum) require the correct Hz value to calculate meaningful frequencies. The Nyquist limit (half of sampling rate) determines the maximum frequency you can detect.
          </div>
        )}

        {/* Signal Type Selector - Compact Radio Buttons */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
            What type of signal is your data?
          </label>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0.5rem',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '0.5rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0'
          }}>
            {Object.entries(SIGNAL_TYPES).map(([key, config]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  backgroundColor: signalType === key ? '#e0f2fe' : 'transparent',
                  transition: 'background-color 0.15s'
                }}
              >
                <input
                  type="radio"
                  name="signalType"
                  value={key}
                  checked={signalType === key}
                  onChange={() => handleSignalTypeChange(key)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.9rem' }}>
                    {config.label}
                  </span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: '#64748b', 
                    marginLeft: '0.5rem' 
                  }}>
                    — {config.description}
                  </span>
                </div>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#0ea5e9', 
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap'
                }}>
                  {config.typicalFs} Hz
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Sampling Frequency Input */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem'
        }}>
          <div style={{ minWidth: '180px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              Sampling Frequency (Hz)
              <span className="info-icon" title="Number of data points recorded per second" style={{ cursor: 'help' }}>
                <BsFillInfoCircleFill />
              </span>
            </label>
            <input
              type="number"
              className="form-input"
              value={configData.samplingFreq}
              onChange={(e) => onConfigChange({ samplingFreq: parseFloat(e.target.value) })}
              min="0.001"
              step="any"
              placeholder="e.g., 50"
              style={{ width: '120px' }}
            />
          </div>
          
          {configData.samplingFreq > 0 && (
            <div style={{ 
              fontSize: '0.8rem',
              color: '#059669'
            }}>
              ✓ Max detectable frequency: <strong>{(configData.samplingFreq / 2).toFixed(1)} Hz</strong> (Nyquist)
            </div>
          )}
        </div>

        {/* Recommended domains tip */}
        {currentSignalConfig && (
          <div style={{ 
            fontSize: '0.8rem',
            color: '#6b7280'
          }}>
            Tip: For {currentSignalConfig.label.split('(')[0].trim()}, recommended domains are{' '}
            <strong>{currentSignalConfig.recommendedDomains.join(', ')}</strong>
          </div>
        )}
      </div>

      {/* Label Detection Section */}
      <div className="form-group">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
          Activity/Label Detection
        </h3>
        
        <label className="checkbox-item" style={{ marginBottom: '0.5rem' }}>
          <input
            type="checkbox"
            className="checkbox-input"
            checked={hasLabels}
            onChange={(e) => handleLabelChange(e.target.checked)}
          />
          <span className="checkbox-label">My data has activity/class labels</span>
        </label>
        
        {hasLabels && availableColumns.length > 0 && (
          <div style={{ marginLeft: '1.5rem' }}>
            <select
              value={selectedLabelColumn}
              onChange={(e) => handleLabelColumnChange(e.target.value)}
              className="form-input"
              style={{ width: '200px' }}
            >
              <option value="">-- Select label column --</option>
              {availableColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        )}
        
        {hasLabels && availableColumns.length === 0 && (
          <p style={{ color: '#ef4444', fontSize: '0.8rem', marginLeft: '1.5rem' }}>
            No text columns found for labels.
          </p>
        )}
      </div>

      {/* Feature Domains */}
      <div className="form-group">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
          Feature Domains
        </h3>
        
        <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label className="checkbox-item">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={configData.domains.includes('temporal')}
              onChange={(e) => handleDomainChange('temporal', e.target.checked)}
            />
            <span className="checkbox-label">
              <strong>Temporal</strong>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                (Zero crossing, Autocorrelation, Energy, Slope)
              </span>
            </span>
          </label>

          <label className="checkbox-item">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={configData.domains.includes('statistical')}
              onChange={(e) => handleDomainChange('statistical', e.target.checked)}
            />
            <span className="checkbox-label">
              <strong>Statistical</strong>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                (Mean, Std, Variance, Skewness, Kurtosis)
              </span>
            </span>
          </label>

          <label className="checkbox-item">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={configData.domains.includes('spectral')}
              onChange={(e) => handleDomainChange('spectral', e.target.checked)}
            />
            <span className="checkbox-label">
              <strong>Spectral</strong>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                (FFT, Power Spectrum, Frequency analysis)
              </span>
            </span>
          </label>
        </div>

        {configData.domains.includes('spectral') && (
          <div style={{ 
            marginTop: '0.5rem', 
            padding: '0.5rem 0.75rem', 
            backgroundColor: '#fef9c3',
            borderRadius: '0.375rem',
            fontSize: '0.8rem',
            color: '#854d0e'
          }}>
            ⚠️ Spectral features require accurate sampling frequency!
          </div>
        )}
      </div>

      {/* Window Parameters */}
      <div className="form-group">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
          Window Parameters
        </h3>
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">
              Window Size (samples)
              <span className="info-icon" title="Number of data points in each window"><BsFillInfoCircleFill /></span>
            </label>
            <input
              type="number"
              className="form-input"
              value={configData.windowSize}
              onChange={(e) => onConfigChange({ windowSize: parseInt(e.target.value) })}
              placeholder="e.g., 128"
              style={{ width: '120px' }}
            />
            {configData.samplingFreq > 0 && configData.windowSize > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                ≈ {(configData.windowSize / configData.samplingFreq).toFixed(2)}s
              </span>
            )}
          </div>

          <div>
            <label className="form-label">
              Overlap (%)
              <span className="info-icon" title="Percentage of overlap between windows"><BsFillInfoCircleFill /></span>
            </label>
            <input
              type="number"
              className="form-input"
              value={configData.overlap}
              onChange={(e) => onConfigChange({ overlap: parseFloat(e.target.value) })}
              min="0"
              max="99"
              placeholder="e.g., 50"
              style={{ width: '80px' }}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ 
          backgroundColor: '#fee2e2', 
          border: '1px solid #fca5a5', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          color: '#991b1b'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Loading state */}
      {isExtracting && (
        <div className="loading-container" style={{ marginBottom: '1rem' }}>
          <div className="loading-spinner"></div>
          <p className="loading-text">Extracting features... This may take a moment.</p>
        </div>
      )}

      {/* Buttons */}
      <div className="button-group">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleRunExtraction}
          disabled={isExtracting}
        >
          {isExtracting ? 'Extracting...' : 'Run Extraction →'}
        </button>
      </div>
    </div>
  );
}

export default Step2Configure;