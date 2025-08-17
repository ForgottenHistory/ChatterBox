function ErrorMessage({ 
  message, 
  variant = 'error',
  className = '' 
}) {
  if (!message) return null

  const variants = {
    error: 'bg-[#ED4245] text-white',
    warning: 'bg-[#FAA61A] text-black',
    info: 'bg-[#5865F2] text-white'
  }

  return (
    <div className={`${variants[variant]} p-3 rounded-lg text-sm ${className}`}>
      {message}
    </div>
  )
}

export default ErrorMessage