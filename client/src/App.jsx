import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import MessageList from './components/chat/MessageList'
import MessageInput from './components/chat/MessageInput'

function App() {
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

export default App