import Input from './Input'

function FormField({ 
  label, 
  name, 
  type = 'text',
  value, 
  onChange, 
  placeholder, 
  required = false,
  error = false,
  className = ''
}) {
  return (
    <div className={className}>
      <label className="block text-[#B9BBBE] text-sm font-medium mb-2">
        {label} {required && '*'}
      </label>
      <Input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        error={error}
      />
    </div>
  )
}

export default FormField