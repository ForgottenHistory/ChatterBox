import { useAuth } from '../../contexts/AuthContext'
import UserInfo from '../ui/UserInfo'
import Button from '../ui/Button'

function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-[#202225] border-b border-[#40444B] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-[#FFFFFF] text-xl font-semibold">ChatterBox</h1>
      </div>
      
      <div className="flex items-center gap-3">
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
  )
}

export default Header