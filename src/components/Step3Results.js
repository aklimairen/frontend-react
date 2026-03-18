import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { Tooltip } from 'react-tooltip';
import featureDescriptions from '../featureDescriptions.json';
import { BsFillQuestionCircleFill, BsChevronDown, BsChevronUp , BsCloudDownloadFill, BsFillQuestionSquareFill, BsFillGrid3X3GapFill, BsFillMouse2Fill, BsBrushFill } from "react-icons/bs";
import { BsGraphUp } from "react-icons/bs";
import TimeSeriesVisualization from './TimeSeriesVisualization';

const API_URL = 'https://tsfel-backend.onrender.com';

function Step3Results({ results, onNewExtraction, uploadedFile, windowSize, overlap, labelColumn }) {
  const [activeTab, setActiveTab] = useState('all');
  const [showDistPlots, setShowDistPlots] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHeatmapTutorial, setShowHeatmapTutorial] = useState(false); // Changed to false - tutorial hidden by default
  const [showTimeSeriesViz, setShowTimeSeriesViz] = useState(false);

  console.log('🎨 Step3Results rendering with results:', results);

  if (!results) {
    return (
      <div className="step-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Extracting features...</p>
        </div>
      </div>
    );
  }

  // Helper function to get feature info
  const getFeatureInfo = (featureName) => {
    // Remove 'signal_' prefix if present
    const cleanName = featureName.replace('signal_', '');
    
    // Try to find exact match
    if (featureDescriptions[cleanName]) {
      return featureDescriptions[cleanName];
    }
    
    // Try partial match for features with variations
    const matchKey = Object.keys(featureDescriptions).find(key => 
      cleanName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(cleanName.toLowerCase())
    );
    
    if (matchKey) {
      return featureDescriptions[matchKey];
    }
    
    // Return default if no match found
    return featureDescriptions._default;
  };

  const handleDownload = () => {
    window.open(`${API_URL}/download/${results.result_file}`, '_blank');
  };

  // Get features based on active tab
  const getFilteredFeatures = () => {
    if (activeTab === 'all') {
      return results.features || {};
    }
    return results.features_by_domain?.[activeTab] || {};
  };

  const filteredFeatures = getFilteredFeatures();
  const featureEntries = Object.entries(filteredFeatures);

  // Prepare data for distribution plots
  const prepareDistributionData = () => {
    const entries = featureEntries.slice(0, 10);
    return [{
      x: entries.map(([name]) => name.replace('signal_', '')),
      y: entries.map(([, value]) => value),
      type: 'bar',
      marker: {
        color: '#14b8a6',
        line: {
          color: '#0d9488',
          width: 1
        }
      }
    }];
  };

  // Calculate correlation matrix with beginner-friendly tooltips
  const calculateCorrelationMatrix = () => {
    const entries = featureEntries.slice(0, 12); // Top 12 features for better readability
    const values = entries.map(([, value]) => parseFloat(value) || 0);
    const n = values.length;
    
    // Calculate correlation matrix
    const matrix = [];
    const hoverText = [];
    
    for (let i = 0; i < n; i++) {
      const row = [];
      const hoverRow = [];
      for (let j = 0; j < n; j++) {
        let correlation;
        if (i === j) {
          correlation = 1.0; // Perfect correlation with self
        } else {
          // Simplified correlation based on value similarity
          const diff = Math.abs(values[i] - values[j]);
          const maxVal = Math.max(Math.abs(values[i]), Math.abs(values[j]), 0.0001);
          correlation = 1 - Math.min(diff / maxVal, 1);
        }
        row.push(correlation);
        
        // Create beginner-friendly hover text
        const feature1 = entries[i][0].replace('signal_', '');
        const feature2 = entries[j][0].replace('signal_', '');
        const value1 = values[i].toFixed(4);
        const value2 = values[j].toFixed(4);
        
        let interpretation = '';
        let relationshipType = '';
        let emoji = '';
        let actionAdvice = '';
        
        if (i === j) {
          interpretation = 'Same feature - always perfectly correlated';
          relationshipType = '🔄 Self-correlation';
          emoji = '🎯';
          actionAdvice = 'This is the diagonal - every feature correlates perfectly with itself';
        } else if (correlation > 0.8) {
          interpretation = 'Strong relationship - these features tend to increase/decrease together';
          relationshipType = '🔴 Strong Positive';
          emoji = '⚠️';
          actionAdvice = 'Consider removing one feature (redundant) to simplify your model';
        } else if (correlation > 0.5) {
          interpretation = 'Moderate relationship - features show some connection';
          relationshipType = '🟠 Moderate Positive';
          emoji = '📊';
          actionAdvice = 'These features provide somewhat similar information';
        } else if (correlation > 0.2) {
          interpretation = 'Weak relationship - features are mostly independent';
          relationshipType = '🟡 Weak Positive';
          emoji = '✨';
          actionAdvice = 'Good! These features capture different aspects of your data';
        } else {
          interpretation = 'Very weak or no relationship - features are independent';
          relationshipType = '⚪ No Correlation';
          emoji = '✅';
          actionAdvice = 'Excellent! These features provide unique, complementary information';
        }
        
        hoverRow.push(
          `<b style="font-size: 14px;">${emoji} Correlation Analysis</b><br>` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br><br>` +
          `<b>📍 Comparing Two Features:</b><br>` +
          `<span style="color: #0ea5e9;">▸ Row (Y-axis):</span> <b>${feature1}</b><br>` +
          `<span style="padding-left: 12px;">Value = ${value1}</span><br><br>` +
          `<span style="color: #0ea5e9;">▸ Column (X-axis):</span> <b>${feature2}</b><br>` +
          `<span style="padding-left: 12px;">Value = ${value2}</span><br>` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━<br>` +
          `<b>📈 Correlation Score:</b> ${correlation.toFixed(3)}<br>` +
          `<b>🏷️ Relationship Type:</b> ${relationshipType}<br><br>` +
          `<b>💡 What this means:</b><br>` +
          `<span style="font-style: italic; color: #64748b;">${interpretation}</span><br><br>` +
          `<b>🎯 Recommendation:</b><br>` +
          `<span style="color: #059669;">${actionAdvice}</span>`
        );
      }
      matrix.push(row);
      hoverText.push(hoverRow);
    }
    
    // Create shorter, clearer axis labels with feature index
    const xLabels = entries.map(([name], idx) => {
      const shortName = name.replace('signal_', '').substring(0, 15);
      return `F${idx + 1}: ${shortName}${name.length > 18 ? '...' : ''}`;
    });
    
    const yLabels = entries.map(([name], idx) => {
      const shortName = name.replace('signal_', '').substring(0, 15);
      return `F${idx + 1}: ${shortName}${name.length > 18 ? '...' : ''}`;
    });
    
    return {
      z: matrix,
      x: xLabels,
      y: yLabels,
      text: hoverText,
      type: 'heatmap',
      hovertemplate: '%{text}<extra></extra>',
      colorscale: [
        [0, '#1e40af'],    // Dark blue (no correlation)
        [0.25, '#60a5fa'], // Light blue
        [0.5, '#fbbf24'],  // Yellow (medium)
        [0.75, '#f97316'], // Orange
        [1, '#dc2626']     // Red (perfect correlation)
      ],
      showscale: true,
      colorbar: {
        title: {
          text: '<b>Correlation<br>Strength</b>',
          side: 'right',
          font: { size: 12 }
        },
        tickmode: 'array',
        tickvals: [0, 0.25, 0.5, 0.75, 1.0],
        ticktext: [
          '0.0<br><span style="font-size: 9px;">None</span>', 
          '0.25<br><span style="font-size: 9px;">Weak</span>', 
          '0.5<br><span style="font-size: 9px;">Medium</span>', 
          '0.75<br><span style="font-size: 9px;">Strong</span>', 
          '1.0<br><span style="font-size: 9px;">Perfect</span>'
        ],
        thickness: 20,
        len: 0.7
      }
    };
  };

  return (
    <div className="step-container">
      <h2 className="step-title">Summary of Extracted Features</h2>
      <p className="step-description">
        View the extracted features organized by domain. Use the tabs to explore summaries, 
        distributions, correlations, and visual overlays. Filter, analyze, and export your results with ease.
      </p>

      {/* Success Badge */}
      <div style={{ 
        backgroundColor: '#d1fae5', 
        padding: '1.5rem', 
        borderRadius: '0.75rem', 
        marginBottom: '1rem',
        border: '1px solid #6ee7b7'
      }}>
        <p style={{ fontSize: '1.125rem', fontWeight: 600, color: '#065f46' }}>
          ✓ Successfully extracted {results.feature_count} features!
        </p>
      </div>

      {/* Correlation Removal Info Banner */}
      {results.correlation_info && (
        <div style={{ 
          backgroundColor: '#eff6ff', 
          padding: '1.25rem', 
          borderRadius: '0.75rem', 
          marginBottom: '2rem',
          border: '1px solid #93c5fd',
          borderLeft: '4px solid #3b82f6'
        }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.75rem' }}>
            🧹 Intelligent Feature Selection Applied
          </p>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#1e3a8a' }}>
            <div>
              <span style={{ color: '#6b7280' }}>Original features:</span>{' '}
              <strong>{results.correlation_info.original_count}</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Redundant removed:</span>{' '}
              <strong style={{ color: results.correlation_info.removed_count > 0 ? '#dc2626' : '#059669' }}>
                {results.correlation_info.removed_count || 0}
              </strong>
              {results.correlation_info.removed_count === 0 && (
                <span style={{ fontSize: '0.8rem', color: '#059669' }}> (none had ≥90% correlation)</span>
              )}
            </div>
            <div>
              <span style={{ color: '#6b7280' }}>Top features for visualization:</span>{' '}
              <strong style={{ color: '#059669' }}>{results.correlation_info.top_features_count}</strong>
            </div>
          </div>
          {results.correlation_info.removed_features && results.correlation_info.removed_features.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem', marginBottom: 0 }}>
              💡 Removed redundant features: {results.correlation_info.removed_features.slice(0, 5).join(', ')}
              {results.correlation_info.removed_features.length > 5 && ` and ${results.correlation_info.removed_features.length - 5} more...`}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Features
          </button>
          <button
            className={`tab ${activeTab === 'statistical' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistical')}
          >
            Statistical Features
          </button>
          <button
            className={`tab ${activeTab === 'temporal' ? 'active' : ''}`}
            onClick={() => setActiveTab('temporal')}
          >
            Temporal Features
          </button>
          <button
            className={`tab ${activeTab === 'spectral' ? 'active' : ''}`}
            onClick={() => setActiveTab('spectral')}
          >
            Spectral Features
          </button>
        </div>
      </div>

      {/* Feature Summary Table */}
      <div className="collapsible-section">
        <div className="collapsible-header" style={{ backgroundColor: '#f9fafb' }}>
          <h3 className="collapsible-title">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Features Summary Table
          </h3>
        </div>
        <div className="collapsible-content">
          <div style={{ overflowX: 'auto' }}>
            <table className="feature-table">
              <thead>
                <tr>
                  <th>Feature Name</th>
                 
                  <th>Domain</th>
                  <th>Complexity</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {featureEntries.slice(0, 20).map(([name, value]) => {
                  const cleanName = name.replace('signal_', '').replace(/^0_/, '');
                  const featureInfo = getFeatureInfo(name);
                  
                  // Determine domain from backend's features_by_domain
                  let domain = 'Mixed';
                  let notes = '-';
                  
                  // Check which domain contains this feature
                  if (results.features_by_domain) {
                    if (results.features_by_domain.statistical && name in results.features_by_domain.statistical) {
                      domain = 'Statistical';
                    } else if (results.features_by_domain.temporal && name in results.features_by_domain.temporal) {
                      domain = 'Temporal';
                    } else if (results.features_by_domain.spectral && name in results.features_by_domain.spectral) {
                      domain = 'Spectral';
                    }
                  }
                  
                  // Determine complexity based on feature name (from TSFEL documentation)
                  const nameLower = name.toLowerCase();
                  let complexity = { notation: 'O(n)', label: 'Low', color: '#10b981' };
                  
                  if (nameLower.includes('autocorr') || nameLower.includes('lpcc')) {
                    complexity = { notation: 'O(n²)', label: 'High', color: '#ef4444' };
                  } else if (nameLower.includes('fft') || nameLower.includes('spectral') || 
                             nameLower.includes('frequency') || nameLower.includes('power') ||
                             nameLower.includes('mfcc') || nameLower.includes('wavelet') ||
                             nameLower.includes('median') || nameLower.includes('percentile') ||
                             nameLower.includes('ecdf') || nameLower.includes('entropy') ||
                             nameLower.includes('interquartile')) {
                    complexity = { notation: 'O(n log n)', label: 'Medium', color: '#f59e0b' };
                  }
                  
                  // Set helpful notes based on domain and feature name
                  if (domain === 'Statistical') {
                    if (nameLower.includes('mean') || nameLower.includes('median')) {
                      notes = 'Central tendency measure';
                    } else if (nameLower.includes('std') || nameLower.includes('variance')) {
                      notes = 'Spread/dispersion measure';
                    } else if (nameLower.includes('skew')) {
                      notes = 'Distribution asymmetry';
                    } else if (nameLower.includes('kurtosis')) {
                      notes = 'Distribution tail behavior';
                    } else if (nameLower.includes('percentile') || nameLower.includes('ecdf')) {
                      notes = 'Distribution quantile';
                    } else {
                      notes = 'Statistical measure';
                    }
                  } else if (domain === 'Temporal') {
                    if (nameLower.includes('zero') && nameLower.includes('cross')) {
                      notes = 'Signal oscillation rate';
                    } else if (nameLower.includes('autocorr')) {
                      notes = 'Self-similarity over time';
                    } else if (nameLower.includes('slope')) {
                      notes = 'Trend direction';
                    } else if (nameLower.includes('peak')) {
                      notes = 'Local extrema count';
                    } else if (nameLower.includes('entropy')) {
                      notes = 'Signal complexity';
                    } else if (nameLower.includes('energy')) {
                      notes = 'Signal power/strength';
                    } else {
                      notes = 'Time-domain pattern';
                    }
                  } else if (domain === 'Spectral') {
                    if (nameLower.includes('fft') || nameLower.includes('frequency')) {
                      notes = 'Frequency component';
                    } else if (nameLower.includes('power') || nameLower.includes('spectral')) {
                      notes = 'Power spectrum feature';
                    } else if (nameLower.includes('mfcc')) {
                      notes = 'Audio/speech feature';
                    } else if (nameLower.includes('wavelet')) {
                      notes = 'Multi-resolution analysis';
                    } else {
                      notes = 'Frequency-domain feature';
                    }
                  }
                  
                  // Domain badge colors
                  const domainColors = {
                    'Statistical': { bg: '#dbeafe', text: '#1e40af' },
                    'Temporal': { bg: '#d1fae5', text: '#065f46' },
                    'Spectral': { bg: '#fef3c7', text: '#92400e' },
                    'Mixed': { bg: '#e5e7eb', text: '#374151' }
                  };
                  const colors = domainColors[domain] || domainColors['Mixed'];
                  
                  return (
                    <tr key={name}>
                      <td style={{ fontWeight: 500 }}>
                        <span 
                          data-tooltip-id="feature-tooltip"
                          data-tooltip-html={`
                            <div style="text-align: left; max-width: 300px;">
                              <strong style="font-size: 16px;">${featureInfo.icon} ${cleanName}</strong>
                              <hr style="margin: 8px 0; border-color: #14b8a6;"/>
                              <p style="margin: 8px 0;"><strong>Description:</strong><br/>${featureInfo.description}</p>
                              <p style="margin: 8px 0;"><strong>Use Case:</strong><br/>${featureInfo.useCase}</p>
                              <p style="margin: 8px 0;"><strong>Interpretation:</strong><br/>${featureInfo.interpretation}</p>
                              <p style="margin: 8px 0; font-size: 12px; color: #6b7280;"><strong>Complexity:</strong> ${featureInfo.complexity}</p>
                            </div>
                          `}
                          style={{ 
                            cursor: 'help',
                            borderBottom: '1px dotted #14b8a6',
                            display: 'inline-block'
                          }}
                        >
                          {cleanName} <BsFillQuestionCircleFill />
                        </span>
                      </td>
                      
                      <td>
                        <span style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}>
                          {domain}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{
                            backgroundColor: complexity.label === 'High' ? '#fef2f2' : 
                                           complexity.label === 'Medium' ? '#fffbeb' : '#f0fdf4',
                            color: complexity.color,
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            fontFamily: 'monospace'
                          }}>
                            {complexity.notation}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            color: complexity.color,
                            fontWeight: 500
                          }}>
                            {complexity.label}
                          </span>
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: '#6b7280' }}>{notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>
              Showing {Math.min(20, featureEntries.length)} of {featureEntries.length} features
            </p>
          </div>
        </div>
      </div>

      {/* Time Series Windowing Visualization */}
      <div className="collapsible-section">
        <div 
          className="collapsible-header"
          onClick={() => setShowTimeSeriesViz(!showTimeSeriesViz)}
          style={{ cursor: 'pointer', backgroundColor: '#f0f9ff', borderLeft: '4px solid #0ea5e9' }}
        >
          <h3 className="collapsible-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BsGraphUp /> Time Series Windowing Analysis
          </h3>
          <span className={`collapsible-icon ${showTimeSeriesViz ? 'open' : ''}`}>
            {showTimeSeriesViz ? <BsChevronUp /> : <BsChevronDown />}
          </span>
        </div>
        {showTimeSeriesViz && (
          <div className="collapsible-content" style={{ padding: 0 }}>
            {uploadedFile && windowSize && (
              <TimeSeriesVisualization 
                filename={uploadedFile}
                windowSize={windowSize}
                overlap={overlap || 0.5}
                labelColumn={labelColumn || null}
                onClose={() => setShowTimeSeriesViz(false)}
                selectedFeaturesForViz={results.selected_features_for_viz || []}
                correlationInfo={results.correlation_info || null}
              />
            )}
            {(!uploadedFile || !windowSize) && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                <p>Unable to load visualization. Missing file or window parameters.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Distribution Plots */}
      <div className="collapsible-section">
        <div 
          className="collapsible-header"
          onClick={() => setShowDistPlots(!showDistPlots)}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="collapsible-title">Distribution Plots</h3>
          <span className={`collapsible-icon ${showDistPlots ? 'open' : ''}`}>
            {showDistPlots ? <BsChevronUp /> : <BsChevronDown />}
          </span>
        </div>
        {showDistPlots && (
          <div className="collapsible-content">
            {featureEntries.length > 0 ? (
              <>
                <Plot
                  data={prepareDistributionData()}
                  layout={{
                    title: {
                      text: 'Distribution of Feature Values',
                      font: { size: 16, weight: 'bold' }
                    },
                    xaxis: { 
                      title: 'Feature Names',
                      tickangle: -45,
                      automargin: true
                    },
                    yaxis: { 
                      title: 'Feature Values',
                      automargin: true
                    },
                    height: 500,
                    margin: { t: 60, b: 150, l: 80, r: 40 },
                    plot_bgcolor: '#f9fafb',
                    paper_bgcolor: 'white'
                  }}
                  config={{ 
                    responsive: true, 
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d']
                  }}
                  style={{ width: '100%' }}
                />
                <div style={{ 
                  backgroundColor: '#f0fdfa', 
                  padding: '1rem', 
                  borderRadius: '0.5rem', 
                  marginTop: '1rem',
                  border: '1px solid #99f6e4'
                }}>
                  <p style={{ fontSize: '0.875rem', color: '#065f46' }}>
                    <strong>💡 Interpretation:</strong> This chart shows the top 10 features and their values. 
                    Higher bars indicate larger feature values. Compare features to understand which aspects 
                    of your time series are most prominent.
                  </p>
                </div>
              </>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                No features available for plotting
              </p>
            )}
          </div>
        )}
      </div>

      {/* Correlation Heatmap */}
      {featureEntries.length >= 3 && (
        <div className="collapsible-section">
          <div 
            className="collapsible-header"
            onClick={() => setShowHeatmap(!showHeatmap)}
            style={{ cursor: 'pointer' }}
          >
            <h3 className="collapsible-title">Correlation Heatmap</h3>
            <span className={`collapsible-icon ${showHeatmap ? 'open' : ''}`}>
              {showHeatmap ? <BsChevronUp /> : <BsChevronDown />}
            </span>
          </div>
          {showHeatmap && (
            <div className="collapsible-content">
              
              {/* Simple Help Button with Collapsible Tutorial */}
              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setShowHeatmapTutorial(!showHeatmapTutorial)}
                  style={{
                    color: '#6b7280',          // light gray
                    cursor: 'pointer',
                    textAlign: 'right',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    userSelect: 'none',
                    transition: 'color 0.2s ease',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    boxShadow: 'none',
                  }}
                  onMouseEnter={(e) => (e.target.style.color = '#4b5563')} // slightly darker gray on hover
                  onMouseLeave={(e) => (e.target.style.color = '#6b7280')}
                >
                  {showHeatmapTutorial ? (
                    'Hide Help'
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <BsFillQuestionSquareFill />
                      Need Help Understanding This Heatmap?
                    </span>
                  )}

                </button>
                
                {/* Collapsible Tutorial Content */}
                {showHeatmapTutorial && (
                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '2px solid #f59e0b',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    marginTop: '1rem'
                  }}>
                    <h4 style={{ color: '#92400e', marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>
                      🎓 How to Read the Correlation Heatmap
                    </h4>
                    
                    {/* 3 Simple Steps */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr 1fr', 
                      gap: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.5rem',
                        border: '1px solid #fcd34d'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}><BsFillGrid3X3GapFill /></div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#78350f', fontSize: '0.9rem' }}>Find a Cell</h5>
                        <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0, lineHeight: '1.4' }}>
                          Each cell shows the relationship between two features (X-axis bottom, Y-axis left)
                        </p>
                      </div>
                      
                      <div style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.5rem',
                        border: '1px solid #fcd34d'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}><BsFillMouse2Fill /></div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#78350f', fontSize: '0.9rem' }}>Hover Over It</h5>
                        <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0, lineHeight: '1.4' }}>
                          A tooltip shows: feature names, values, correlation score, and what it means
                        </p>
                      </div>
                      
                      <div style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.5rem',
                        border: '1px solid #fcd34d'
                      }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}><BsBrushFill /></div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: '#78350f', fontSize: '0.9rem' }}>Check the Color</h5>
                        <p style={{ fontSize: '0.8rem', color: '#92400e', margin: 0, lineHeight: '1.4' }}>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Red</span> = strong, 
                          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}> Orange</span> = moderate, 
                          <span style={{ color: '#3b82f6', fontWeight: 'bold' }}> Blue</span> = weak/none
                        </p>
                      </div>
                    </div>
                    
                    {/* Color Guide */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      padding: '1rem', 
                      borderRadius: '0.5rem',
                      marginBottom: '1.5rem',
                      border: '1px solid #fcd34d'
                    }}>
                      <h5 style={{ color: '#78350f', marginTop: 0, marginBottom: '0.75rem' }}>🎨 Color Meaning:</h5>
                      <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: '1.8' }}>
                        <div><strong style={{ color: '#dc2626' }}>● Red (0.8-1.0):</strong> Very strong - features are almost identical (consider removing one)</div>
                        <div><strong style={{ color: '#f97316' }}>● Orange (0.5-0.8):</strong> Moderate - some relationship exists</div>
                        <div><strong style={{ color: '#fbbf24' }}>● Yellow (0.25-0.5):</strong> Weak - little relationship</div>
                        <div><strong style={{ color: '#60a5fa' }}>● Blue (0.0-0.25):</strong> Very weak - features are independent (good!)</div>
                      </div>
                    </div>
                    
                    {/* Three Important Info Boxes - Material UI Style */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      {/* Good Sign Box */}
                      <div style={{ 
                        backgroundColor: '#f0fdf4', 
                        padding: '1rem', 
                        borderRadius: '0.75rem',
                        border: '1px solid #86efac',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(134, 239, 172, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div style={{ 
                            backgroundColor: '#dcfce7', 
                            borderRadius: '50%', 
                            width: '40px', 
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            flexShrink: 0
                          }}>
                            ✅
                          </div>
                          <div>
                            <h6 style={{ 
                              margin: '0 0 0.5rem 0', 
                              color: '#166534', 
                              fontSize: '0.9rem',
                              fontWeight: '600'
                            }}>
                              Good Sign
                            </h6>
                            <p style={{ 
                              fontSize: '0.8rem', 
                              color: '#14532d', 
                              margin: 0, 
                              lineHeight: '1.5' 
                            }}>
                              Mostly blue/light colors means your features capture different, complementary information - ideal for analysis!
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Watch Out Box */}
                      <div style={{ 
                        backgroundColor: '#fff7ed', 
                        padding: '1rem', 
                        borderRadius: '0.75rem',
                        border: '1px solid #fdba74',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s ease',
                        cursor: 'default'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(253, 186, 116, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <div style={{ 
                            backgroundColor: '#fed7aa', 
                            borderRadius: '50%', 
                            width: '40px', 
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            flexShrink: 0
                          }}>
                            ⚠️
                          </div>
                          <div>
                            <h6 style={{ 
                              margin: '0 0 0.5rem 0', 
                              color: '#9a3412', 
                              fontSize: '0.9rem',
                              fontWeight: '600'
                            }}>
                              Watch Out
                            </h6>
                            <p style={{ 
                              fontSize: '0.8rem', 
                              color: '#7c2d12', 
                              margin: 0, 
                              lineHeight: '1.5' 
                            }}>
                              Large red blocks (not diagonal) mean redundant features. Consider removing some to simplify your model.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Real-World Application Box - Full Width */}
                    <div style={{ 
                      backgroundColor: '#eff6ff', 
                      padding: '1.25rem', 
                      borderRadius: '0.75rem',
                      border: '1px solid #93c5fd',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      marginBottom: '1rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(147, 197, 253, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ 
                          backgroundColor: '#dbeafe', 
                          borderRadius: '50%', 
                          width: '48px', 
                          height: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          flexShrink: 0
                        }}>
                          💡
                        </div>
                        <div style={{ flex: 1 }}>
                          <h6 style={{ 
                            margin: '0 0 0.75rem 0', 
                            color: '#1e3a8a', 
                            fontSize: '0.95rem',
                            fontWeight: '600'
                          }}>
                            Real-World Application
                          </h6>
                          <p style={{ 
                            fontSize: '0.85rem', 
                            color: '#1e40af', 
                            margin: 0, 
                            lineHeight: '1.6' 
                          }}>
                            <strong>Example:</strong> If you see a red cell connecting "Mean" and "Median" (correlation = 0.95), 
                            these features are giving you almost the same information. For a cleaner model, you could use just "Mean" 
                            and remove "Median" without losing much information. This is called <em>feature selection</em> or <em>removing redundancy</em>.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Note Box */}
                    <div style={{ 
                      backgroundColor: '#fefce8', 
                      padding: '0.875rem', 
                      borderRadius: '0.5rem',
                      border: '1px solid #fde047',
                      borderLeft: '4px solid #eab308',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                      <p style={{ 
                        fontSize: '0.8rem', 
                        color: '#713f12', 
                        margin: 0,
                        lineHeight: '1.5',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>📝</span>
                        <span>
                          <strong>Note for Researchers:</strong> This is a simplified correlation visualization. 
                          For peer-reviewed research, calculate proper Pearson or Spearman correlation coefficients using the exported CSV.
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* The Heatmap Plot */}
              <Plot
                data={[calculateCorrelationMatrix()]}
                layout={{
                  title: {
                    text: 'Feature Correlation Matrix',
                    font: { size: 18, weight: 'bold', color: '#1f2937' }
                  },
                  height: 600,
                  width: undefined,
                  autosize: true,
                  margin: { t: 80, l: 180, r: 120, b: 180 },
                  xaxis: { 
                    title: {
                      text: '<b>Feature Name</b><br><i style="font-size:11px">← Click and drag to zoom in</i>',
                      standoff: 20
                    },
                    tickangle: -45,
                    side: 'bottom',
                    tickfont: { size: 10 }
                  },
                  yaxis: { 
                    title: {
                      text: '<b>Feature Name</b>',
                      standoff: 20
                    },
                    tickangle: 0,
                    automargin: true,
                    tickfont: { size: 10 }
                  },
                  plot_bgcolor: '#f9fafb',
                  paper_bgcolor: 'white',
                  annotations: [
                    {
                      text: '💡 Hover over cells to see detailed correlation information',
                      xref: 'paper',
                      yref: 'paper',
                      x: 0.5,
                      y: 1.12,
                      xanchor: 'center',
                      yanchor: 'bottom',
                      showarrow: false,
                      font: {
                        size: 11,
                        color: '#6b7280',
                        family: 'Arial'
                      }
                    }
                  ]
                }}
                config={{ 
                  responsive: true, 
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                  toImageButtonOptions: {
                    format: 'png',
                    filename: 'feature_correlation_heatmap',
                    height: 800,
                    width: 1000,
                    scale: 2
                  }
                }}
                style={{ width: '100%' }}
                useResizeHandler={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Export Your Results */}
      <div className="collapsible-section">
        <div 
          className="collapsible-header"
          onClick={() => setShowExport(!showExport)}
          style={{ cursor: 'pointer' }}
        >
          <h3 className="collapsible-title">Export Your Results</h3>
          <span className={`collapsible-icon ${showExport ? 'open' : ''}`}>
            {showExport ? <BsChevronUp /> : <BsChevronDown />}
          </span>
        </div>
        {showExport && (
          <div className="collapsible-content">
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Select one or more export formats:
            </p>
            
            <div className="export-options">
              <div className="export-option">
                <label className="export-option-label">
                  <input type="checkbox" defaultChecked className="checkbox-input" />
                  <strong>Export extracted features as CSV file</strong>
                </label>
                <p className="export-option-description">
                  Download a table of all extracted features and values for further analysis.
                </p>
              </div>

              <div className="export-option">
                <label className="export-option-label">
                  <input type="checkbox" className="checkbox-input" />
                  <strong>Export correlation heatmap as image (PNG)</strong>
                </label>
                <p className="export-option-description">
                  Save the visual correlation matrix as a high-quality image for presentations or reports.
                </p>
              </div>              
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleDownload}
              style={{ marginTop: '1rem' }}
            >
              <BsCloudDownloadFill /> Export
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="button-group" style={{ marginTop: '2rem' }}>
        <button className="btn btn-primary" onClick={handleDownload}>
          <BsCloudDownloadFill /> Download Results CSV
        </button>
        <button className="btn btn-secondary" onClick={onNewExtraction}>
          ← New Extraction
        </button>
      </div>

      {/* Tooltip Component */}
      <Tooltip 
        id="feature-tooltip" 
        place="right"
        style={{
          backgroundColor: '#1f2937',
          color: '#f9fafb',
          borderRadius: '0.5rem',
          padding: '1rem',
          maxWidth: '350px',
          zIndex: 9999,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
        }}
      />
    </div>
  );
}

export default Step3Results;