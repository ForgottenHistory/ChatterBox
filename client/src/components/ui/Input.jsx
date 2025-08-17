function Input({ 
  type = 'text',
  placeholder = '',
  value,
  onChange,
  className = '',
  error = false,
  ...props
}) {
  const baseClasses = 'w-full bg-[#40444B] text-[#FFFFFF] placeholder-[#72767D] px-4 py-3 rounded-lg border-none outline-none transition-all'
  const focusClasses = error 
    ? 'focus:ring-2 focus:ring-[#ED4245]' 
    : 'focus:ring-2 focus:ring-[#5865F2]'
  const errorClasses = error ? 'ring-2 ring-[#ED4245]' : ''

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`${baseClasses} ${focusClasses} ${errorClasses} ${className}`}
      {...props}
    />
  )
}

export default Input