import Avatar from './Avatar'

function UserInfo({ 
  user, 
  showWelcome = false,
  avatarSize = 'sm',
  className = '' 
}) {
  if (!user) return null

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar 
        name={user.username} 
        avatar={user.avatar}
        size={avatarSize}
        isBot={user.isBot}
      />
      <div className="text-[#B9BBBE] text-sm">
        {showWelcome ? `Welcome, ${user.username}!` : user.username}
      </div>
    </div>
  )
}

export default UserInfo