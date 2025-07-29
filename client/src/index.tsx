import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/base.css';
import './styles/chat.css';
import './styles/sidebar.css';
import './styles/modal.css';
import './styles/components.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
