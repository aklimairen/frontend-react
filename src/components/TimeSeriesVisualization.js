import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { BsInfoCircle } from 'react-icons/bs';

const API_URL = 'https://tsfel-backend.onrender.com';

function TimeSeriesVisualization({ 
  filename, 
  windowSize, 
  overlap, 
  labelColumn, 
  onClose,
  selectedFeaturesForViz = [],  // Dynamic features from extraction
  correlationInfo = null         // Correlation removal info
}) {
  const [vizData, setVizData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Use first selected feature or fallback to 'Mean'
  const [selectedFeature, setSelectedFeature] = useState(
    selectedFeaturesForViz.length > 0 ? selectedFeaturesForViz[0] : 'Mean'
  );
  const [error, setError] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Update selected feature when selectedFeaturesForViz changes
  useEffect(() => {
    if (selectedFeaturesForViz.length > 0 && !selectedFeaturesForViz.includes(selectedFeature)) {
      setSelectedFeature(selectedFeaturesForViz[0]);
    }
  }, [selectedFeaturesForViz]);

  useEffect(() => {
    fetchVisualizationData();
  }, [filename, windowSize, overlap, selectedFeature, labelColumn]);

  const fetchVisualizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          window_size: windowSize,
          overlap,
          selected_feature: selectedFeature,
          label_column: labelColumn || null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setVizData(data);
      } else {
        setError(data.error || 'Failed to load visualization data');
      }
    } catch (err) {
      setError('Failed to fetch visualization data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="time-series-viz loading">
        <div className="loading-spinner"></div>
        <p>Loading visualization...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="time-series-viz error">
        <p className="error-message">⚠️ {error}</p>
        <button onClick={onClose} className="close-btn">Close</button>
      </div>
    );
  }

  if (!vizData) {
    return null;
  }

  // Prepare the raw time series plot with window shading
  const prepareTimeSeriesPlot = () => {
    const traces = [];
    
    // Main signal line
    traces.push({
      x: vizData.signal.x,
      y: vizData.signal.y,
      type: 'scatter',
      mode: 'lines',
      name: 'Time Series',
      line: { color: '#0ea5e9', width: 1.5 },
      hovertemplate: 'Sample: %{x}<br>Value: %{y:.3f}<extra></extra>'
    });

    // Add window labels - only for first few and last few windows to avoid clutter
    if (vizData.windows && vizData.windows.length > 0) {
      const windowsToLabel = vizData.windows.length <= 10 ? 
        vizData.windows.map((w, i) => ({ ...w, index: i })) :
        [
          ...vizData.windows.slice(0, 3).map((w, i) => ({ ...w, index: i })),
          ...vizData.windows.slice(-2).map((w, i) => ({ ...w, index: vizData.windows.length - 2 + i }))
        ];

      windowsToLabel.forEach(({ start, end, label, index }) => {
        traces.push({
          x: [(start + end) / 2],
          y: [Math.min(...vizData.signal.y) - (Math.max(...vizData.signal.y) - Math.min(...vizData.signal.y)) * 0.05],
          type: 'scatter',
          mode: 'text',
          text: [label || `W${index + 1}`],
          textposition: 'bottom center',
          showlegend: false,
          hoverinfo: 'skip',
          textfont: { size: 10, color: '#666' }
        });
      });
    }

    // Add activity labels if present
    if (vizData.has_labels && vizData.activity_segments) {
      vizData.activity_segments.slice(0, 10).forEach((segment) => {
        traces.push({
          x: [(segment.start + segment.end) / 2],
          y: [Math.max(...vizData.signal.y) * 1.05],
          type: 'scatter',
          mode: 'text',
          text: [segment.label],
          textposition: 'top center',
          showlegend: false,
          hoverinfo: 'skip',
          textfont: { 
            size: 11, 
            color: segment.color,
            family: 'Arial, sans-serif'
          }
        });
      });
    }

    return traces;
  };

  // Prepare the feature values per window plot
  const prepareFeaturePlot = () => {
    const windowCenters = vizData.windows.map(w => (w.start + w.end) / 2);
    const windowLabels = vizData.window_labels || vizData.windows.map(w => w.label || `Window ${w.window_num}`);

    return [{
      x: windowCenters,
      y: vizData.window_features,
      type: 'bar',
      name: `${selectedFeature} per Window`,
      marker: {
        color: vizData.has_labels && vizData.windows ? 
          vizData.windows.map(w => w.color || '#14b8a6') :
          '#14b8a6',
        line: { color: '#0d9488', width: 1 }
      },
      text: windowLabels,
      hovertemplate: '%{text}<br>%{y:.3f}<extra></extra>',
      width: vizData.window_size * 0.8
    }];
  };

  // Prepare shapes for window backgrounds
  const prepareShapes = () => {
    if (!vizData.windows || vizData.windows.length === 0) return [];
    
    if (vizData.has_labels && vizData.activity_segments) {
      // Show activity segments with colors
      return vizData.activity_segments.slice(0, 20).map(segment => ({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: segment.start,
        x1: segment.end,
        y0: 0,
        y1: 1,
        fillcolor: segment.color,
        opacity: 0.1,
        line: { width: 0 }
      }));
    } else {
      // Show alternating window colors
      return vizData.windows.slice(0, Math.min(20, vizData.windows.length)).map((window, idx) => ({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: window.start,
        x1: window.end,
        y0: 0,
        y1: 1,
        fillcolor: idx % 2 === 0 ? 'rgba(20,184,166,0.05)' : 'rgba(59,130,246,0.05)',
        line: { width: 0 }
      }));
    }
  };

  return (
    <div className="time-series-viz-container">
      <div className="viz-header">
        <h3>Time Series Windowing Visualization</h3>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>

      <div className="viz-info">
        <BsInfoCircle />
        <span>
          This visualization shows how TSFEL divides your time series into windows and extracts features from each window.
          Window Size: {vizData.window_size} samples | Overlap: {(vizData.overlap * 100).toFixed(0)}%
          {vizData.actual_window_count && vizData.actual_window_count !== vizData.windows.length && 
            ` | Showing subset of ${vizData.actual_window_count} total windows`
          }
        </span>
      </div>

      {/* Large Dataset Warning */}
      {vizData.total_samples > 100000 && (
        <div style={{ 
          background: '#fef3c7', 
          border: '1px solid #f59e0b',
          padding: '1rem',
          margin: '1rem',
          borderRadius: '0.5rem'
        }}>
          <strong>⚡ Large Dataset Detected!</strong>
          <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
            Your data has {vizData.total_samples.toLocaleString()} samples. 
            Showing {vizData.windows.length} representative windows for performance.
            {vizData.actual_window_count && ` All ${vizData.actual_window_count} windows were used for feature extraction.`}
          </p>
        </div>
      )}

      {/* Tutorial Section */}
      <div style={{ margin: '1rem' }}>
        <button
          onClick={() => setShowTutorial(!showTutorial)}
          style={{
            background: 'none',
            border: '1px solid #d1d5db',
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            color: '#4b5563',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            hover: { background: '#f9fafb' }
          }}
          onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
          onMouseLeave={(e) => e.target.style.background = 'none'}
        >
          <span>📚 {showTutorial ? 'Hide' : 'Show'} Tutorial: Understanding Time Series Windowing</span>
          <span>{showTutorial ? '▲' : '▼'}</span>
        </button>
        
        {showTutorial && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginTop: '1rem'
          }}>
            <h4 style={{ color: '#166534', marginBottom: '1rem', fontSize: '1.1rem' }}>
              🎓 Beginner's Guide to Time Series Windowing
            </h4>
            
            {/* What is Windowing? */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ color: '#15803d', marginBottom: '0.5rem' }}>
                1️⃣ What is Windowing?
              </h5>
              <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#166534', marginBottom: '0.5rem' }}>
                Imagine you have a very long video. Instead of watching it all at once, you divide it into 
                small clips (windows) and analyze each clip separately. That's exactly what windowing does 
                with your time series data!
              </p>
              <div style={{ 
                background: 'white', 
                padding: '0.75rem', 
                borderRadius: '0.375rem',
                fontFamily: 'monospace'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#374151' }}>
                  Your Data: [────────────────────────]<br/>
                  Windows:&nbsp;&nbsp; [──][──][──][──][──][──]
                </div>
              </div>
            </div>

            {/* Understanding the Top Graph */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ color: '#15803d', marginBottom: '0.5rem' }}>
                2️⃣ Top Graph: Your Original Data
              </h5>
              <ul style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#166534', paddingLeft: '1.5rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  🔵 <strong>Blue Line:</strong> Your actual time series data (sensor readings, measurements, etc.)
                </li>
                <li style={{ marginBottom: '0.25rem' }}>
                  ⬜ <strong>Shaded Areas:</strong> Each shaded region is one "window"
                </li>
                <li>
                  📍 <strong>Window Labels:</strong> W1, W2, W3... show window numbers
                </li>
              </ul>
            </div>

            {/* Understanding the Bottom Graph */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ color: '#15803d', marginBottom: '0.5rem' }}>
                3️⃣ Bottom Graph: Features from Each Window
              </h5>
              <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: '#166534' }}>
                Each bar shows the {selectedFeature} calculated from that window's data. 
                For example, if you select "Mean", each bar shows the average value of all data points in that window.
              </p>
            </div>

            {/* Window Parameters Explained */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ color: '#15803d', marginBottom: '0.5rem' }}>
                4️⃣ Your Current Settings
              </h5>
              <div style={{ background: 'white', padding: '1rem', borderRadius: '0.375rem' }}>
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  <strong style={{ color: '#374151' }}>Window Size: {vizData.window_size} samples</strong>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0' }}>
                    Each window contains {vizData.window_size} data points. 
                    Larger windows = fewer windows, more stable features.
                  </p>
                </div>
                <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  <strong style={{ color: '#374151' }}>Overlap: {(vizData.overlap * 100).toFixed(0)}%</strong>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0' }}>
                    Windows share {(vizData.overlap * 100).toFixed(0)}% of their data with neighbors. 
                    This ensures smooth transitions and doesn't miss patterns at boundaries.
                  </p>
                </div>
                <div>
                  <strong style={{ color: '#374151' }}>Total Windows: {vizData.windows.length}</strong>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0' }}>
                    Your data was divided into {vizData.windows.length} windows for analysis.
                    {vizData.actual_window_count && vizData.actual_window_count !== vizData.windows.length && 
                      ` (Showing ${vizData.windows.length} of ${vizData.actual_window_count} for visualization)`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Why is this useful? */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ color: '#15803d', marginBottom: '0.5rem' }}>
                5️⃣ Why is Windowing Useful?
              </h5>
              <div style={{ fontSize: '0.875rem', lineHeight: '1.8', color: '#166534' }}>
                <div style={{ marginBottom: '0.25rem' }}>
                  📊 <strong>Feature Extraction:</strong> Extract statistical features from each window
                </div>
                <div style={{ marginBottom: '0.25rem' }}>
                  🎯 <strong>Pattern Detection:</strong> Find repeating patterns or anomalies
                </div>
                <div style={{ marginBottom: '0.25rem' }}>
                  🤖 <strong>Machine Learning:</strong> Create fixed-size inputs for ML models
                </div>
                <div>
                  📈 <strong>Trend Analysis:</strong> See how features change over time
                </div>
              </div>
            </div>

            {/* Interactive Tips */}
            <div style={{ 
              background: '#fef3c7', 
              padding: '1rem', 
              borderRadius: '0.375rem',
              border: '1px solid #fbbf24'
            }}>
              <h5 style={{ color: '#92400e', marginBottom: '0.5rem' }}>
                💡 Interactive Tips
              </h5>
              <ul style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: 0, paddingLeft: '1.5rem' }}>
                <li>Try changing the "Select Feature" dropdown to see different statistics</li>
                <li>Hover over the graphs to see exact values</li>
                <li>Notice how feature values change across windows</li>
                {vizData.has_labels && (
                  <li>Colored regions show different activities/labels in your data</li>
                )}
              </ul>
            </div>

            {/* Example Interpretation */}
            {vizData.window_features && vizData.window_features.length > 1 && (
              <div style={{ 
                marginTop: '1rem',
                background: '#e0e7ff', 
                padding: '1rem', 
                borderRadius: '0.375rem',
                border: '1px solid #a5b4fc'
              }}>
                <h5 style={{ color: '#3730a3', marginBottom: '0.5rem' }}>
                  📖 Example: Reading Your Graph
                </h5>
                <p style={{ fontSize: '0.875rem', color: '#4c1d95', marginBottom: '0.5rem' }}>
                  Looking at your current visualization:
                </p>
                <ul style={{ fontSize: '0.875rem', color: '#4c1d95', paddingLeft: '1.5rem' }}>
                  <li>
                    Your signal shows a {vizData.signal.y[0] > vizData.signal.y[vizData.signal.y.length-1] ? 'decreasing' : 'increasing'} trend
                  </li>
                  <li>
                    The {selectedFeature} values {
                      vizData.window_features[0] < vizData.window_features[vizData.window_features.length-1] ? 
                      'increase' : vizData.window_features[0] > vizData.window_features[vizData.window_features.length-1] ? 
                      'decrease' : 'vary'
                    } across windows
                  </li>
                  <li>
                    This pattern suggests your data has {
                      Math.abs(vizData.window_features[0] - vizData.window_features[vizData.window_features.length-1]) < 
                      (Math.max(...vizData.window_features) - Math.min(...vizData.window_features)) * 0.1 ? 
                      'relatively stable behavior' : 'changing patterns over time'
                    }
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Label Legend if available */}
      {vizData.has_labels && vizData.unique_labels && vizData.unique_labels.length > 0 && (
        <div className="label-legend" style={{ 
          padding: '1rem', 
          background: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          margin: '0 1rem'
        }}>
          <strong>Detected Labels:</strong>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {vizData.unique_labels.slice(0, 10).map((label) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: vizData.label_colors?.[label] || '#888',
                  borderRadius: '3px',
                  border: '1px solid rgba(0,0,0,0.2)'
                }}></div>
                <span style={{ fontSize: '0.875rem' }}>{label}</span>
              </div>
            ))}
            {vizData.unique_labels.length > 10 && (
              <span style={{ fontStyle: 'italic', color: '#666', fontSize: '0.875rem' }}>
                ... and {vizData.unique_labels.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="feature-selector">
        <label>Select Feature to Display:</label>
        <select 
          value={selectedFeature} 
          onChange={(e) => setSelectedFeature(e.target.value)}
          className="feature-select"
        >
          {/* Dynamic features from TSFEL extraction (after correlation removal) */}
          {selectedFeaturesForViz.length > 0 ? (
            <>
              <optgroup label="🎯 Top Features (After Correlation Removal)">
                {selectedFeaturesForViz.map((feature, index) => (
                  <option key={feature} value={feature}>
                    {index + 1}. {feature.replace('signal_', '').replace('0_', '')}
                  </option>
                ))}
              </optgroup>
              <optgroup label="📊 Basic Statistics">
                <option value="Mean">Mean</option>
                <option value="Std">Standard Deviation</option>
                <option value="Max">Maximum</option>
                <option value="Min">Minimum</option>
                <option value="Median">Median</option>
                <option value="Variance">Variance</option>
              </optgroup>
            </>
          ) : (
            // Fallback to basic features if no selected features provided
            <>
              <option value="Mean">Mean</option>
              <option value="Std">Standard Deviation</option>
              <option value="Max">Maximum</option>
              <option value="Min">Minimum</option>
            </>
          )}
        </select>
        
        {/* Feature count info */}
        {selectedFeaturesForViz.length > 0 && (
          <span style={{ 
            marginLeft: '1rem', 
            fontSize: '0.875rem', 
            color: '#6b7280',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <span style={{ color: '#10b981' }}>✓</span>
            {selectedFeaturesForViz.length} top features available
          </span>
        )}
      </div>
      
      {/* Correlation Info Banner */}
      {correlationInfo && (
        <div style={{ 
          margin: '1rem', 
          padding: '1rem', 
          backgroundColor: '#f0fdf4', 
          border: '1px solid #86efac',
          borderRadius: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontWeight: 600, color: '#166534', marginBottom: '0.5rem' }}>
            🧹 Feature Selection Summary
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', color: '#15803d' }}>
            <span>Original: <strong>{correlationInfo.original_count}</strong> features</span>
            <span>Redundant removed: <strong>{correlationInfo.removed_count || 0}</strong></span>
            <span>Top features shown: <strong>{correlationInfo.top_features_count}</strong></span>
          </div>
          {correlationInfo.removed_count === 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#16a34a' }}>
              ✓ No features had ≥90% correlation - your features are already independent!
            </div>
          )}
          {correlationInfo.removed_features && correlationInfo.removed_features.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#4ade80' }}>
              Removed: {correlationInfo.removed_features.slice(0, 3).join(', ')}...
            </div>
          )}
        </div>
      )}

      <div className="plots-container">
        {/* Raw Time Series with Windows */}
        <div className="plot-section">
          <h4>1. Original Time Series with Window Segmentation</h4>
          <p className="plot-description">
            The blue line shows your raw data. 
            {vizData.has_labels ? 
              ' Colored regions represent different activities/labels.' : 
              ' Vertical dashed lines indicate window boundaries.'}
            {vizData.windows.length > 20 && ' (Showing subset for performance)'}
          </p>
          <Plot
            data={prepareTimeSeriesPlot()}
            layout={{
              height: 300,
              margin: { t: 40, b: 50, l: 60, r: 30 },
              xaxis: { 
                title: 'Sample Index',
                showgrid: true,
                gridcolor: 'rgba(0,0,0,0.1)'
              },
              yaxis: { 
                title: 'Signal Value',
                showgrid: true,
                gridcolor: 'rgba(0,0,0,0.1)'
              },
              hovermode: 'x unified',
              plot_bgcolor: '#f9fafb',
              paper_bgcolor: 'white',
              shapes: prepareShapes()
            }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>

        {/* Feature Values per Window */}
        <div className="plot-section">
          <h4>2. Extracted {selectedFeature} Feature per Window</h4>
          <p className="plot-description">
            Each bar represents the {selectedFeature.toLowerCase()} value extracted from the corresponding window above.
            {vizData.has_labels && ' Bar colors match the activity/label colors.'}
          </p>
          <Plot
            data={prepareFeaturePlot()}
            layout={{
              height: 250,
              margin: { t: 30, b: 50, l: 60, r: 30 },
              xaxis: { 
                title: 'Sample Index (Window Centers)',
                showgrid: true,
                gridcolor: 'rgba(0,0,0,0.1)',
                range: [0, vizData.total_samples]
              },
              yaxis: { 
                title: `${selectedFeature} Value`,
                showgrid: true,
                gridcolor: 'rgba(0,0,0,0.1)'
              },
              hovermode: 'x',
              plot_bgcolor: '#f9fafb',
              paper_bgcolor: 'white',
              bargap: 0.1
            }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>
      </div>

      {/* Summary Section */}
      <div className="viz-summary">
        <h4>Summary</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="label">Total Samples:</span>
            <span className="value">{vizData.total_samples.toLocaleString()}</span>
          </div>
          <div className="summary-item">
            <span className="label">Number of Windows:</span>
            <span className="value">{vizData.actual_window_count || vizData.windows.length}</span>
          </div>
          <div className="summary-item">
            <span className="label">Window Size:</span>
            <span className="value">{vizData.window_size} samples</span>
          </div>
          <div className="summary-item">
            <span className="label">Overlap:</span>
            <span className="value">{(vizData.overlap * 100).toFixed(0)}%</span>
          </div>
          {vizData.has_labels && (
            <div className="summary-item">
              <span className="label">Unique Labels:</span>
              <span className="value">{vizData.unique_labels.length}</span>
            </div>
          )}
          {vizData.actual_window_count && vizData.actual_window_count !== vizData.windows.length && (
            <div className="summary-item">
              <span className="label">Displayed Windows:</span>
              <span className="value">{vizData.windows.length}</span>
            </div>
          )}
        </div>

        {/* Big Data Optimization Message */}
        {vizData.total_samples > 100000 && (
          <div style={{ 
            marginTop: '1rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '0.5rem'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
              🚀 Big Data Optimization Applied
            </h4>
            <p style={{ fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
              Dataset: {(vizData.total_samples / 1000000).toFixed(2)}M samples | 
              Windows: {vizData.actual_window_count || vizData.windows.length} total | 
              Visualization optimized to {vizData.windows.length} windows | 
              Performance gain: {((vizData.actual_window_count || vizData.windows.length) / vizData.windows.length).toFixed(0)}x faster rendering
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimeSeriesVisualization;