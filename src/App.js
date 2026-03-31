import React, { useState } from 'react';
import './App.css';
import Step1Upload from './components/Step1Upload';
import Step2Configure from './components/Step2Configure';
import Step3Results from './components/Step3Results';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
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
    labelColumn: ''
  });
  const [extractionResults, setExtractionResults] = useState(null);

  const handleFileUpload = (file, info) => {
    setUploadedFile(file);
    setFileInfo(info);
  };

  const handleGoToStep2 = () => {
    setCurrentStep(2);
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  const handleConfigChange = (newConfig) => {
    setConfigData({ ...configData, ...newConfig });
  };

  const handleExtractionComplete = (results) => {
    setExtractionResults(results);
    setCurrentStep(3);
  };

  const handleNewExtraction = () => {
    setCurrentStep(1);
    setUploadedFile(null);
    setFileInfo(null);
    setExtractionResults(null);
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

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>TSFEL Feature Extraction Tool</h1>
          <p className="header-subtitle">
            Extract time series features without programming
          </p>
        </div>
        
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step-dot ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <span>1</span>
            <span className="step-label">Upload</span>
          </div>
          <div className={`step-line ${currentStep > 1 ? 'completed' : ''}`}></div>
          <div className={`step-dot ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <span>2</span>
            <span className="step-label">Configure</span>
          </div>
          <div className={`step-line ${currentStep > 2 ? 'completed' : ''}`}></div>
          <div className={`step-dot ${currentStep >= 3 ? 'active' : ''}`}>
            <span>3</span>
            <span className="step-label">Results</span>
          </div>
        </div>
      </header>

      <main className="app-main">
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
          <>
            {extractionResults ? (
              <Step3Results
                results={extractionResults}
                onNewExtraction={handleNewExtraction}
                uploadedFile={fileInfo?.filename}
                windowSize={configData.windowSize}
                overlap={configData.overlap / 100}
                labelColumn={configData.labelColumn}
              />
            ) : (
              <div className="error-container">
                <p className="error-title">Something went wrong</p>
                <p className="error-text">No results were returned. Please try again.</p>
                <button className="btn btn-primary" onClick={handleBackToStep1}>
                  Start Over
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Powered by <a href="https://github.com/fraunhoferportugal/tsfel" target="_blank" rel="noopener noreferrer">TSFEL Library</a>
          {' | '}Master's Thesis Project - University of Bremen
        </p>
      </footer>
    </div>
  );
}

export default App;
