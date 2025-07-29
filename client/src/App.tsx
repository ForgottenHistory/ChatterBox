import React from 'react';
import { UserProvider, useUser } from './contexts/userContext';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import LoadingScreen from './components/LoadingScreen';
import UserSetup from './components/UserSetup';

const AppContent: React.FC = () => {
  const { hasUser, isLoading } = useUser();

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen isLoading={true} />;
  }

  // Show welcome/setup screen if no user
  if (!hasUser) {
    return <UserSetup />;
  }

  // Show main app once user is set up
  return (
    <div className="app">
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