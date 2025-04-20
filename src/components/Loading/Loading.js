import React from 'react';

/**
 * Loading component that displays a spinner during loading states
 * This is extracted as a separate component for better code organization
 * and to enable code splitting
 */
const Loading = () => (
  <div className="loading">
    <div className="loading-spinner"></div>
  </div>
);

export default Loading;