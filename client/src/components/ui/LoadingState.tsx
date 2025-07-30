import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  className = 'loading-state' 
}) => (
  <div className={className}>
    {message}
  </div>
);

export default LoadingState;