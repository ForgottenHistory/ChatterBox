import { createContext, useContext, useState } from 'react'

const BotContext = createContext()

export const useBot = () => {
  const context = useContext(BotContext)
  if (!context) {
    throw new Error('useBot must be used within a BotProvider')
  }
  return context
}

export const BotProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refreshBots = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const value = {
    refreshTrigger,
    refreshBots
  }

  return (
    <BotContext.Provider value={value}>
      {children}
    </BotContext.Provider>
  )
}