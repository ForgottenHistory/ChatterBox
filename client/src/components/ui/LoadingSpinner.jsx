function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  centered = false,
  className = '' 
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }

  const containerClass = centered 
    ? 'flex items-center justify-center' 
    : 'flex items-center'

  return (
    <div className={`${containerClass} gap-2 ${className}`}>
      <div className={`${sizes[size]} border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin`} />
      {text && (
        <span className="text-[#FFFFFF] text-sm">{text}</span>
      )}
    </div>
  )
}

export default LoadingSpinner