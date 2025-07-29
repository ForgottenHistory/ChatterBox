import React from 'react';
import { UserProvider, useUser } from './contexts/userContext';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import UserSetupModal from './components/UserSetupModal';
import LoadingScreen from './components/LoadingScreen';

const AppContent: React.FC = () => {
  const { isUsernameSet, isLoading } = useUser();

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen isLoading={true} />;
  }

  return (
    <div className="app">
      {/* Show setup modal only after loading is complete */}
      <UserSetupModal isOpen={!isUsernameSet} />
      
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