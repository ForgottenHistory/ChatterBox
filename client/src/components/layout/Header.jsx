import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useBot } from '../../contexts/BotContext'
import UserInfo from '../ui/UserInfo'
import Button from '../ui/Button'
import BotCreationForm from '../bots/BotCreationForm'

function Header({ onOpenSettings }) {
  const { user, logout } = useAuth()
  const { refreshBots } = useBot()
  const [showBotForm, setShowBotForm] = useState(false)

  const handleBotCreated = (botData) => {
    console.log('Bot created:', botData)
    refreshBots() // Trigger bot list refresh
  }

  const handleSettingsClick = () => {
    console.log('Settings button clicked') // Debug log
    if (onOpenSettings) {
      onOpenSettings()
    } else {
      console.error('onOpenSettings prop not provided')
    }
  }

  return (
    <>
      <header className="bg-[#202225] border-b border-[#40444B] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[#FFFFFF] text-xl font-semibold">ChatterBox</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleSettingsClick}
          >
            ⚙️ Settings
          </Button>
          
          <Button 
            variant="success" 
            size="sm" 
            onClick={() => setShowBotForm(true)}
          >
            + Create Bot
          </Button>
          
          <UserInfo user={user} showWelcome />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className="hover:bg-[#ED4245] hover:text-white"
          >
            Logout
          </Button>
        </div>
      </header>

      {showBotForm && (
        <BotCreationForm 
          onClose={() => setShowBotForm(false)}
          onBotCreated={handleBotCreated}
        />
      )}
    </>
  )
}

export default Header