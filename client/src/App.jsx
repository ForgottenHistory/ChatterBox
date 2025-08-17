import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { BotProvider } from './contexts/BotContext'
import { NotificationProvider } from './contexts/NotificationContext'
import RegisterPage from './components/auth/RegisterPage'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import MessageList from './components/chat/MessageList'
import MessageInput from './components/chat/MessageInput'
import LoadingSpinner from './components/ui/LoadingSpinner'
import NotificationBanner from './components/ui/NotificationBanner'
import SettingsModal from './components/settings/SettingsModal'

function ChatInterface() {
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    // Listen for custom event to open settings (from notifications)
    const handleOpenSettingsEvent = () => {
      console.log('Opening settings from notification event')
      setShowSettings(true)
    }

    window.addEventListener('openSettings', handleOpenSettingsEvent)
    return () => window.removeEventListener('openSettings', handleOpenSettingsEvent)
  }, [])

  const handleOpenSettings = () => {
    console.log('Opening settings from header button')
    setShowSettings(true)
  }

  const handleCloseSettings = () => {
    console.log('Closing settings modal')
    setShowSettings(false)
  }

  return (
    <BotProvider>
      <div className="h-screen bg-[#36393F] flex flex-col">
        <Header onOpenSettings={handleOpenSettings} />
        <NotificationBanner />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 bg-[#36393F] flex flex-col">
            <MessageList />
            <MessageInput />
          </main>
        </div>
        
        {showSettings && (
          <SettingsModal onClose={handleCloseSettings} />
        )}
      </div>
    </BotProvider>
  )
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen bg-[#36393F] flex items-center justify-center">
        <LoadingSpinner size="lg" centered />
      </div>
    )
  }

  return isAuthenticated ? <ChatInterface /> : <RegisterPage />
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App