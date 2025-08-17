import { createContext, useContext, useState, useEffect } from 'react'

const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [notificationCounter, setNotificationCounter] = useState(0)

  const addNotification = (notification) => {
    const id = `notification-${notificationCounter}-${Date.now()}`
    setNotificationCounter(prev => prev + 1)
    
    const newNotification = {
      id,
      type: 'warning', // 'info', 'warning', 'error', 'success'
      persistent: false, // Whether it auto-dismisses
      ...notification
    }

    // Check for duplicate notifications by type and title
    setNotifications(prev => {
      const isDuplicate = prev.some(n => 
        n.type === newNotification.type && 
        n.title === newNotification.title
      )
      
      if (isDuplicate) {
        console.log('Preventing duplicate notification:', newNotification.title)
        return prev
      }
      
      return [...prev, newNotification]
    })
    
    // Auto-dismiss non-persistent notifications
    if (!newNotification.persistent) {
      setTimeout(() => {
        removeNotification(id)
      }, 5000)
    }
    
    return id
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  // Check for missing API configuration
  const checkAPIConfiguration = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings/llm')
      if (response.ok) {
        const settings = await response.json()
        
        // Clear existing API-related notifications first
        setNotifications(prev => prev.filter(n => 
          !n.title?.includes('API Key') && !n.title?.includes('Model')
        ))
        
        // Check if API key is missing
        if (!settings.api_key || settings.api_key.trim() === '') {
          addNotification({
            type: 'warning',
            title: 'API Key Missing',
            message: 'AI responses are disabled. Please configure your API key in Settings.',
            persistent: true,
            action: {
              label: 'Open Settings',
              onClick: () => {
                window.dispatchEvent(new CustomEvent('openSettings'))
              }
            }
          })
        }
        
        // Check if model is missing
        if (!settings.model) {
          addNotification({
            type: 'warning', 
            title: 'Model Not Selected',
            message: 'Please select an AI model in Settings for bot responses.',
            persistent: true,
            action: {
              label: 'Open Settings',
              onClick: () => {
                window.dispatchEvent(new CustomEvent('openSettings'))
              }
            }
          })
        }
      }
    } catch (error) {
      console.error('Error checking API configuration:', error)
    }
  }

  // Check API config on mount and periodically
  useEffect(() => {
    // Initial check with delay to let everything load
    const initialTimeout = setTimeout(() => {
      checkAPIConfiguration()
    }, 1000)
    
    // Check every 30 seconds
    const interval = setInterval(checkAPIConfiguration, 30000)
    
    // Listen for settings updates
    const handleSettingsUpdate = () => {
      console.log('Settings updated, rechecking API configuration...')
      // Small delay to let settings save
      setTimeout(checkAPIConfiguration, 1000)
    }
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate)
    
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
      window.removeEventListener('settingsUpdated', handleSettingsUpdate)
    }
  }, [])

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    checkAPIConfiguration
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}