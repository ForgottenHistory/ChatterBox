import React from 'react';

interface ErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div className="error-banner">
      {error}
      <button onClick={onDismiss} aria-label="Dismiss error">×</button>
    </div>
  );
};

export default ErrorBanner;