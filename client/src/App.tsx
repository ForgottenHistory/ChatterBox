import React from 'react';
import { UserProvider, useUser } from './contexts/userContext';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import UsernameModal from './components/usernameModal';

const AppContent: React.FC = () => {
  const { isUsernameSet } = useUser();

  return (
    <div className="app">
      <UsernameModal isOpen={!isUsernameSet} />
      
      <header className="app-header">
        <div className="header-left">
          <h1>ChatterBox</h1>
          <p>AI Chat Platform</p>
        </div>
      </header>
      
      <aside className="app-sidebar">
        <Sidebar />
      </aside>
      
      <main className="app-main">
        <Chat />
      </main>
    </div>
  );
};

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;