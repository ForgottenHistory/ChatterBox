import { AuthProvider, useAuth } from './contexts/AuthContext'
import RegisterPage from './components/auth/RegisterPage'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import MessageList from './components/chat/MessageList'
import MessageInput from './components/chat/MessageInput'
import LoadingSpinner from './components/ui/LoadingSpinner'

function ChatInterface() {
  return (
    <div className="h-screen bg-[#36393F] flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-[#36393F] flex flex-col">
          <MessageList />
          <MessageInput />
        </main>
      </div>
    </div>
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
      <AppContent />
    </AuthProvider>
  )
}

export default App