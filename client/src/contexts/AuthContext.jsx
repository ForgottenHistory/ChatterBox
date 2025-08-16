import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    if (!validating) {
      validateStoredUser()
    }
  }, [])

  const validateStoredUser = async () => {
    if (validating) {
      console.log('Already validating user, skipping...')
      return
    }
    
    setValidating(true)
    setLoading(true)
    
    try {
      // Check if user is stored in localStorage
      const storedUser = localStorage.getItem('chatterbox_user')
      
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        console.log('Validating stored user:', userData.username)
        
        // Validate that this user actually exists in the database
        const response = await fetch(`http://localhost:5000/api/users/validate/${userData.id}`)
        
        if (response.ok) {
          const validatedUser = await response.json()
          setUser(validatedUser)
          console.log('✅ User validated from database')
        } else {
          console.log('❌ Stored user not found in database, clearing localStorage')
          localStorage.removeItem('chatterbox_user')
          setUser(null)
        }
      } else {
        console.log('No stored user found')
        setUser(null)
      }
    } catch (error) {
      console.error('Error validating stored user:', error)
      // Clear invalid stored data
      localStorage.removeItem('chatterbox_user')
      setUser(null)
    } finally {
      setLoading(false)
      setValidating(false)
    }
  }

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('chatterbox_user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('chatterbox_user')
  }

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}