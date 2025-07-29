import React from 'react';

interface InputProps {
  id?: string;
  type?: 'text' | 'email' | 'password' | 'file';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  accept?: string;
  error?: boolean;
  className?: string;
  label?: string;
  errorMessage?: string;
  ref?: React.RefObject<HTMLInputElement>;
}

const Input: React.FC<InputProps> = ({
  id,
  type = 'text',
  value,
  onChange,
  onKeyPress,
  placeholder,
  disabled = false,
  autoFocus = false,
  maxLength,
  accept,
  error = false,
  className = '',
  label,
  errorMessage,
  ref
}) => {
  const inputClasses = [
    'input',
    error ? 'input-error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-group">
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        accept={accept}
        className={inputClasses}
      />
      {errorMessage && (
        <span className="input-error-message">{errorMessage}</span>
      )}
    </div>
  );
};

export default Input;