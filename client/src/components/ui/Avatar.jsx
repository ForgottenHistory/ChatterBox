function Avatar({ 
  name, 
  isBot = false, 
  size = 'md', 
  className = '',
  status = null // 'online', 'away', 'offline'
}) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  }

  const bgColor = isBot ? 'bg-[#7289DA]' : 'bg-[#5865F2]'
  const initial = name ? name[0].toUpperCase() : '?'

  const statusColors = {
    online: 'bg-[#57F287]',
    away: 'bg-[#FEE75C]',
    offline: 'bg-[#72767D]'
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizes[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold`}>
        {initial}
      </div>
    </div>
  )
}

export default Avatar