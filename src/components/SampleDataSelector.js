import React, { useState } from 'react';
import axios from 'axios';
import sampleDatasets from '../sampleDatasets.json';

const API_URL = 'http://localhost:5000';

function SampleDataSelector({ onSampleSelect, onConfigUpdate }) {
  const [selectedSample, setSelectedSample] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSampleClick = async (sample) => {
    setSelectedSample(sample.id);
    setIsLoading(true);
    
    try {
      // Fetch the sample CSV file
      const response = await fetch(sample.path);
      if (!response.ok) {
        throw new Error(`Failed to fetch sample: ${response.statusText}`);
      }
      const csvText = await response.text();
      
      // Convert CSV text to File object
      const blob = new Blob([csvText], { type: 'text/csv' });
      const file = new File([blob], sample.filename, { type: 'text/csv' });
      
      // Upload to backend (same as regular file upload)
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (uploadResponse.data.success) {
        // Update configuration with recommended settings
        onConfigUpdate({
          samplingFreq: sample.samplingFreq,
          domains: sample.recommendedSettings.domains,
          windowSize: sample.recommendedSettings.windowSize,
          overlap: sample.recommendedSettings.overlap
        });
        
        // Trigger the sample selection with backend response
        onSampleSelect(file, uploadResponse.data);
      } else {
        alert('Failed to upload sample: ' + uploadResponse.data.error);
      }
      
    } catch (error) {
      console.error('Error loading sample:', error);
      alert(`Failed to load sample data: ${error.message}\n\nMake sure:\n1. Backend is running on port 5000\n2. Sample files exist in public/sample_data/`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: '#f0fdfa', 
        padding: '1rem', 
        borderRadius: '0.5rem', 
        marginBottom: '1rem',
        border: '1px solid #99f6e4'
      }}>
        <h3 style={{ fontSize: '1.125rem', color: '#065f46', marginBottom: '0.5rem', fontWeight: 600 }}>
        Try Sample Datasets
        </h3>
        <p style={{ color: '#047857', fontSize: '0.875rem', margin: 0 }}>
          Don't have data? Try our pre-loaded samples to see TSFEL in action! Each sample is optimized for learning.
        </p>
      </div>

      {/* Sample Cards Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {sampleDatasets.samples.map((sample) => (
          <div
            key={sample.id}
            style={{
              border: selectedSample === sample.id ? '2px solid #14b8a6' : '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              padding: '1rem',
              cursor: isLoading ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              backgroundColor: selectedSample === sample.id ? '#f0fdfa' : 'white',
              position: 'relative',
              opacity: isLoading ? 0.6 : 1
            }}
            onClick={() => !isLoading && handleSampleClick(sample)}
            onMouseEnter={() => setShowDetails(sample.id)}
            onMouseLeave={() => setShowDetails(null)}
          >
            {/* Sample Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>{sample.icon}</span>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                  {sample.name}
                </h4>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  display: 'inline-block',
                  marginTop: '0.25rem'
                }}>
                  {sample.category}
                </span>
              </div>
              {selectedSample === sample.id && (
                <span style={{ 
                  color: '#14b8a6', 
                  fontSize: '1.25rem',
                  fontWeight: 'bold'
                }}>
                  ✓
                </span>
              )}
            </div>

            {/* Sample Description */}
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#4b5563', 
              marginBottom: '0.75rem',
              lineHeight: '1.4'
            }}>
              {sample.description}
            </p>

            {/* Sample Stats */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              fontSize: '0.75rem', 
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              <span>📊 {sample.dataPoints} points</span>
              <span>•</span>
              <span>📡 {sample.samplingFreq} Hz</span>
            </div>

            {/* Hover Details */}
            {showDetails === sample.id && (
              <div style={{
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #e5e7eb',
                fontSize: '0.75rem'
              }}>
                <p style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
                  💡 What you'll learn:
                </p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#4b5563' }}>
                  {sample.learnGoals.slice(0, 2).map((goal, idx) => (
                    <li key={idx} style={{ marginBottom: '0.125rem' }}>{goal}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Click Indicator */}
            <div style={{ 
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <span style={{ 
                fontSize: '0.875rem', 
                color: '#14b8a6',
                fontWeight: 500
              }}>
                {selectedSample === sample.id ? '✓ Loaded' : 'Click to Load →'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        margin: '2rem 0',
        gap: '1rem'
      }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
        <span style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
          OR UPLOAD YOUR OWN
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
      </div>
    </div>
  );
}

export default SampleDataSelector;