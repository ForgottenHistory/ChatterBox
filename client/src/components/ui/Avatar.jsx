function Avatar({ 
  name, 
  avatar = null,
  isBot = false, 
  size = 'md', 
  className = '',
  status = null // 'online', 'away', 'offline'
}) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const statusColors = {
    online: 'bg-[#57F287]',
    away: 'bg-[#FEE75C]',
    offline: 'bg-[#72767D]'
  }

  // If no avatar provided, don't render anything (or could show a default placeholder)
  if (!avatar) {
    return (
      <div className={`${sizes[size]} bg-[#40444B] rounded-full flex items-center justify-center ${className}`}>
        <div className="text-[#72767D] text-xs">No Avatar</div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <img
        src={`http://localhost:5000${avatar}`}
        alt={`${name}'s avatar`}
        className={`${sizes[size]} rounded-full object-cover border-2 ${
          isBot ? 'border-[#7289DA]' : 'border-[#5865F2]'
        }`}
        onError={(e) => {
          // Fallback if image fails to load
          e.target.style.display = 'none'
          e.target.nextSibling.style.display = 'flex'
        }}
      />
      {/* Fallback div (hidden by default) */}
      <div 
        className={`${sizes[size]} bg-[#40444B] rounded-full items-center justify-center text-[#72767D] text-xs hidden`}
        style={{ display: 'none' }}
      >
        Error
      </div>
      {status && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[status]} rounded-full border-2 border-[#36393F]`} />
      )}
    </div>
  )
}

export default Avatar