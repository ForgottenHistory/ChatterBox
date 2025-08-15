function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  ...props 
}) {
  const baseClasses = 'font-medium transition-colors rounded-lg focus:outline-none focus:ring-2'
  
  const variants = {
    primary: 'bg-[#5865F2] hover:bg-[#4752C4] text-white focus:ring-[#5865F2]/50',
    secondary: 'bg-[#40444B] hover:bg-[#36393F] text-[#FFFFFF] focus:ring-[#40444B]/50',
    success: 'bg-[#57F287] hover:bg-[#43B581] text-black focus:ring-[#57F287]/50',
    danger: 'bg-[#ED4245] hover:bg-[#C03C3F] text-white focus:ring-[#ED4245]/50',
    ghost: 'hover:bg-[#40444B] text-[#B9BBBE] hover:text-[#FFFFFF] focus:ring-[#40444B]/50'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : 'cursor-pointer'

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabledClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button