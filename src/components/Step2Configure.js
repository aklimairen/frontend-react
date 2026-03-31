import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BsFillInfoCircleFill, BsFillQuestionCircleFill } from "react-icons/bs";

const API_URL = 'https://tsfel-backend.onrender.com';

// Signal type configurations
const SIGNAL_TYPES = {
  accelerometer: {
    label: 'Accelerometer / IMU',
    description: 'Motion sensors, wearables, activity recognition',
    typicalFs: 50,
    recommendedDomains: ['temporal', 'statistical']
  },
  gyroscope: {
    label: 'Gyroscope',
    description: 'Angular velocity, orientation tracking',
    typicalFs: 50,
    recommendedDomains: ['temporal', 'statistical']
  },
  ecg: {
    label: 'ECG / Biomedical',
    description: 'Heart rate, medical monitoring',
    typicalFs: 250,
    recommendedDomains: ['temporal', 'spectral']
  },
  emg: {
    label: 'EMG (Muscle)',
    description: 'Electromyography signals',
    typicalFs: 1000,
    recommendedDomains: ['temporal', 'spectral', 'statistical']
  },
  audio: {
    label: 'Audio / Speech',
    description: 'Voice recordings, sound analysis',
    typicalFs: 16000,
    recommendedDomains: ['spectral']
  },
  environmental: {
    label: 'Environmental',
    description: 'Temperature, humidity, pressure',
    typicalFs: 1,
    recommendedDomains: ['statistical', 'temporal']
  },
  financial: {
    label: 'Financial Data',
    description: 'Stock prices, market indicators',
    typicalFs: 1,
    recommendedDomains: ['statistical', 'temporal']
  },
  other: {
    label: 'Other / Custom',
    description: 'Custom sampling frequency',
    typicalFs: 50,
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
  const [showWindowHelp, setShowWindowHelp] = useState(false);

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

  const handleSignalTypeChange = (type) => {
    setSignalType(type);
    const signalConfig = SIGNAL_TYPES[type];
    onConfigChange({ 
      samplingFreq: signalConfig.typicalFs,
      signalType: type
    });
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

    try {
      const response = await axios.post(`${API_URL}/extract`, extractionParams);

      if (response.data.success === true && response.data.features) {
        onExtractionComplete(response.data);
      } else {
        setError(response.data.error || 'Extraction failed - no features returned');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to extract features. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const currentSignalConfig = SIGNAL_TYPES[signalType];
  
  // Calculate helpful values
  const windowDuration = configData.samplingFreq > 0 && configData.windowSize > 0 
    ? (configData.windowSize / configData.samplingFreq).toFixed(2) 
    : 0;
  const estimatedWindows = fileInfo && configData.windowSize > 0
    ? Math.floor((fileInfo.rows - configData.windowSize * (configData.overlap/100)) / (configData.windowSize * (1 - configData.overlap/100)))
    : 0;

  return (
    <div className="step-container">
      <h2 className="step-title">Step 2: Configure Feature Extraction</h2>
      <p className="step-description">
        Set parameters for extracting features from <strong>{fileInfo.filename}</strong>
        <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
          ({fileInfo.rows} rows × {fileInfo.columns.length} columns)
        </span>
      </p>

      {/* Signal Type Selection */}
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
            <BsFillQuestionCircleFill /> {showSignalHelp ? 'Hide' : 'Why?'}
          </button>
        </div>

        {showSignalHelp && (
          <div style={{
            backgroundColor: '#eff6ff',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '0.75rem',
            fontSize: '0.8rem',
            color: '#1e40af',
            border: '1px solid #bfdbfe'
          }}>
            <strong>Why Sampling Frequency Matters:</strong><br/>
            • Spectral features (FFT, Power Spectrum) need the correct Hz value<br/>
            • The Nyquist limit (half of sampling rate) is the max frequency you can detect<br/>
            • Wrong frequency = meaningless spectral analysis results
          </div>
        )}

        {/* Signal Type Radio Buttons */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
            Signal Type
          </label>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0.25rem',
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '0.5rem',
            backgroundColor: 'white',
            borderRadius: '0.375rem',
            border: '1px solid #e2e8f0'
          }}>
            {Object.entries(SIGNAL_TYPES).map(([key, config]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.5rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: signalType === key ? '#dbeafe' : 'transparent',
                  fontSize: '0.85rem'
                }}
              >
                <input
                  type="radio"
                  name="signalType"
                  value={key}
                  checked={signalType === key}
                  onChange={() => handleSignalTypeChange(key)}
                />
                <span style={{ fontWeight: 500, color: '#1e293b' }}>{config.label}</span>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>— {config.description}</span>
                <span style={{ marginLeft: 'auto', color: '#0ea5e9', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {config.typicalFs} Hz
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Sampling Frequency */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" style={{ marginBottom: '0.25rem' }}>
              Sampling Frequency (Hz)
            </label>
            <input
              type="number"
              className="form-input"
              value={configData.samplingFreq}
              onChange={(e) => onConfigChange({ samplingFreq: parseFloat(e.target.value) })}
              min="0.001"
              step="any"
              style={{ width: '100px' }}
            />
          </div>
          
          {configData.samplingFreq > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '1.25rem' }}>
              ✓ Nyquist frequency: <strong>{(configData.samplingFreq / 2).toFixed(1)} Hz</strong>
            </div>
          )}
        </div>

        {currentSignalConfig && (
          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.75rem' }}>
            💡 Recommended for {currentSignalConfig.label}: <strong>{currentSignalConfig.recommendedDomains.join(', ')}</strong> domains
          </div>
        )}
      </div>

      {/* Feature Domains */}
      <div className="form-group">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
          Feature Domains
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                — Mean, Std, Variance, Skewness, Kurtosis
              </span>
            </span>
          </label>

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
                — Zero crossing, Autocorrelation, Energy, Slope
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
                — FFT, Power Spectrum, Frequency analysis
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
            ⚠️ Spectral features require accurate sampling frequency
          </div>
        )}
      </div>

      {/* Window Parameters - WITH EDUCATIONAL TOOLTIPS */}
      <div className="form-group" style={{ 
        backgroundColor: '#f8fafc', 
        padding: '1.25rem', 
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', margin: 0 }}>
            Window Parameters
          </h3>
          <button
            type="button"
            onClick={() => setShowWindowHelp(!showWindowHelp)}
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
            <BsFillQuestionCircleFill /> {showWindowHelp ? 'Hide guide' : 'How to choose?'}
          </button>
        </div>

        {/* Educational Tooltip for Window Size */}
        {showWindowHelp && (
          <div style={{
            backgroundColor: '#eff6ff',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#1e40af',
            border: '1px solid #bfdbfe'
          }}>
            <strong style={{ fontSize: '0.9rem' }}>📚 Window Size Guide</strong>
            
            <div style={{ marginTop: '0.75rem' }}>
              <strong>What is a window?</strong>
              <p style={{ margin: '0.25rem 0 0.75rem 0', color: '#3b82f6' }}>
                Your data is divided into smaller segments called "windows". Features are calculated for each window separately.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ backgroundColor: '#dbeafe', padding: '0.75rem', borderRadius: '0.375rem' }}>
                <strong>🔹 Small Window (64-128 samples)</strong>
                <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, fontSize: '0.8rem' }}>
                  <li>Better for detecting <em>fast changes</em></li>
                  <li>Good for short activities (steps, gestures)</li>
                  <li>More windows = more data points</li>
                  <li>Use when: Small dataset (&lt;1000 rows)</li>
                </ul>
              </div>
              
              <div style={{ backgroundColor: '#dbeafe', padding: '0.75rem', borderRadius: '0.375rem' }}>
                <strong>🔸 Large Window (256-512 samples)</strong>
                <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, fontSize: '0.8rem' }}>
                  <li>Better for detecting <em>slow patterns</em></li>
                  <li>Good for long activities (walking, sitting)</li>
                  <li>More stable features, less noise</li>
                  <li>Use when: Large dataset (&gt;5000 rows)</li>
                </ul>
              </div>
            </div>

            <div style={{ backgroundColor: '#fef3c7', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '0.5rem' }}>
              <strong>📏 Rule of Thumb:</strong>
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, fontSize: '0.8rem' }}>
                <li><strong>Small file (&lt;500 rows):</strong> Use window size 32-64</li>
                <li><strong>Medium file (500-5000 rows):</strong> Use window size 128-256</li>
                <li><strong>Large file (&gt;5000 rows):</strong> Use window size 256-512</li>
                <li><strong>Window should be smaller than total rows!</strong></li>
              </ul>
            </div>

            <div>
              <strong>What is Overlap?</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: '#3b82f6', fontSize: '0.8rem' }}>
                Overlap (%) controls how much consecutive windows share. 50% overlap means each window shares half its data with the next, creating smoother transitions. Use 0% for independent windows, 50% for standard analysis.
              </p>
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Window Size (samples)
              <span 
                className="info-icon" 
                title="Number of data points per window. Smaller = more detail, Larger = more stability"
                style={{ cursor: 'help' }}
              >
                <BsFillInfoCircleFill />
              </span>
            </label>
            <input
              type="number"
              className="form-input"
              value={configData.windowSize}
              onChange={(e) => onConfigChange({ windowSize: parseInt(e.target.value) })}
              placeholder="e.g., 128"
              style={{ width: '100px' }}
            />
            {windowDuration > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem' }}>
                = {windowDuration} seconds
              </div>
            )}
          </div>

          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Overlap (%)
              <span 
                className="info-icon" 
                title="How much consecutive windows share. 0% = no overlap, 50% = standard"
                style={{ cursor: 'help' }}
              >
                <BsFillInfoCircleFill />
              </span>
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

          {/* Live Preview */}
          {estimatedWindows > 0 && (
            <div style={{ 
              backgroundColor: '#ecfdf5', 
              padding: '0.75rem', 
              borderRadius: '0.375rem',
              fontSize: '0.8rem',
              color: '#065f46',
              marginTop: '1.25rem'
            }}>
              <strong>Preview:</strong> ~{estimatedWindows} windows will be created
            </div>
          )}
        </div>

        {/* Warning if window size is too large */}
        {configData.windowSize >= fileInfo.rows && (
          <div style={{ 
            marginTop: '0.75rem', 
            padding: '0.5rem 0.75rem', 
            backgroundColor: '#fee2e2',
            borderRadius: '0.375rem',
            fontSize: '0.8rem',
            color: '#991b1b'
          }}>
            ⚠️ Window size ({configData.windowSize}) is larger than your data ({fileInfo.rows} rows). Please use a smaller window.
          </div>
        )}
      </div>

      {/* Label Detection */}
      <div className="form-group">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
          Activity Labels (Optional)
        </h3>
        
        <label className="checkbox-item">
          <input
            type="checkbox"
            className="checkbox-input"
            checked={hasLabels}
            onChange={(e) => handleLabelChange(e.target.checked)}
          />
          <span className="checkbox-label">My data has activity/class labels</span>
        </label>
        
        {hasLabels && availableColumns.length > 0 && (
          <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
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
          disabled={isExtracting || configData.windowSize >= fileInfo.rows}
        >
          {isExtracting ? 'Extracting...' : 'Extract Features →'}
        </button>
      </div>
    </div>
  );
}

export default Step2Configure;
