import React, { useState } from 'react';
import './App.css';
import Step1Upload from './components/Step1Upload';
import Step2Configure from './components/Step2Configure';
import Step3Results from './components/Step3Results';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  // eslint-disable-next-line no-unused-vars
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [configData, setConfigData] = useState({
    samplingFreq: 50,
    handleMissing: true,
    normalize: true,
    noiseReduction: false,
    domains: ['temporal', 'statistical'],
    windowSize: 128,
    overlap: 50,
    hasLabels: false,
    labelColumn: ''  // Add support for label column
  });
  const [extractionResults, setExtractionResults] = useState(null);

  const handleFileUpload = (file, info) => {
    console.log('📁 File uploaded:', file.name);
    console.log('📊 File info:', info);
    setUploadedFile(file);
    setFileInfo(info);
  };

  const handleGoToStep2 = () => {
    console.log('➡️ Going to Step 2');
    setCurrentStep(2);
  };

  const handleBackToStep1 = () => {
    console.log('⬅️ Going back to Step 1');
    setCurrentStep(1);
  };

  const handleConfigChange = (newConfig) => {
    console.log('⚙️ Config changed:', newConfig);
    setConfigData({ ...configData, ...newConfig });
  };

  const handleExtractionComplete = (results) => {
    console.log('✅ EXTRACTION COMPLETE!');
    console.log('📊 Results received:', results);
    console.log('📊 Feature count:', results.feature_count);
    console.log('📊 Features:', Object.keys(results.features || {}).length);
    
    setExtractionResults(results);
    
    console.log('🎯 Setting currentStep to 3');
    setCurrentStep(3);
    
    console.log('✅ State updated - should show Step 3 now');
  };

  const handleNewExtraction = () => {
    console.log('🔄 Starting new extraction');
    setCurrentStep(1);
    setUploadedFile(null);
    setFileInfo(null);
    setExtractionResults(null);
    // Reset config to defaults
    setConfigData({
      samplingFreq: 50,
      handleMissing: true,
      normalize: true,
      noiseReduction: false,
      domains: ['temporal', 'statistical'],
      windowSize: 128,
      overlap: 50,
      hasLabels: false,
      labelColumn: ''
    });
  };

  console.log('🔄 App render - currentStep:', currentStep);
  console.log('📊 extractionResults:', extractionResults ? 'HAS DATA' : 'NO DATA');

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>TSFEL Feature Extraction</h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
            Debug Mode - Current Step: {currentStep}
          </p>
        </div>
      </header>

      <main className="app-main">
        {/* Debug Info */}
        

        {currentStep === 1 && (
          <Step1Upload
            onFileUpload={handleFileUpload}
            onGoToStep2={handleGoToStep2}
            fileInfo={fileInfo}
            configData={configData}
            onConfigChange={handleConfigChange}
          />
        )}

        {currentStep === 2 && (
          <Step2Configure
            fileInfo={fileInfo}
            configData={configData}
            onConfigChange={handleConfigChange}
            onBack={handleBackToStep1}
            onExtractionComplete={handleExtractionComplete}
          />
        )}

        {currentStep === 3 && (
          <div>
            
            
            {extractionResults ? (
              <Step3Results
                results={extractionResults}
                onNewExtraction={handleNewExtraction}
                uploadedFile={fileInfo?.filename}
                windowSize={configData.windowSize}
                overlap={configData.overlap / 100}  // Convert percentage to decimal
                labelColumn={configData.labelColumn}  // Pass label column
              />
            ) : (
              <div style={{
                backgroundColor: '#fee2e2',
                padding: '2rem',
                borderRadius: '0.5rem',
                border: '2px solid #ef4444',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#991b1b' }}>
                  ❌ ERROR: No results data!
                </p>
                <p style={{ fontSize: '0.875rem', color: '#b91c1c', marginTop: '0.5rem' }}>
                  Step 3 mounted but extractionResults is null/undefined
                </p>
                <button 
                  onClick={handleBackToStep1}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#991b1b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Go Back to Step 1
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;