function Badge({ 
  children, 
  variant = 'bot', 
  size = 'sm',
  className = '' 
}) {
  const baseClasses = 'inline-flex items-center font-medium rounded'
  
  const variants = {
    bot: 'bg-[#7289DA] text-white',
    online: 'bg-[#57F287] text-black',
    away: 'bg-[#FEE75C] text-black',
    offline: 'bg-[#72767D] text-white',
    warning: 'bg-[#FAA61A] text-black',
    error: 'bg-[#F04747] text-white'
  }
  
  const sizes = {
    xs: 'px-1 py-0.5 text-[10px]',
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm'
  }

  return (
    <span className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  )
}

export default Badge