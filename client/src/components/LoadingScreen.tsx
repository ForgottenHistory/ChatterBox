import React from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-logo">
          <h1>ChatterBox</h1>
          <p>AI Chat Platform</p>
        </div>
        
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        
        <div className="loading-text">
          <p>Loading your chat experience...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;