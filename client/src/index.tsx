import React from 'react';
import ReactDOM from 'react-dom/client';

// Base styles (variables, reset, layout)
import './styles/base.css';

// Layout specific styles
import './styles/chat.css';
import './styles/sidebar.css';

// Component styles (in dependency order)
import './styles/buttons.css';
import './styles/forms.css';
import './styles/avatars.css';
import './styles/cards.css';
import './styles/lists.css';
import './styles/modals.css';
import './styles/prompts.css';
import './styles/specialized.css';

import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);