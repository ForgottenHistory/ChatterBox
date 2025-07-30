import React from 'react';
import Button from './Button';

interface FormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  className?: string;
  actions?: {
    cancel?: { label: string; onClick: () => void };
    submit: { label: string; disabled?: boolean };
  };
}

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  help?: string;
}

interface FormColorPickerProps {
  colors: string[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
  disabled?: boolean;
}

export const FormRow: React.FC<FormRowProps> = ({ children, className = '' }) => (
  <div className={`form-row ${className}`}>
    {children}
  </div>
);

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  required = false,
  help
}) => (
  <FormRow>
    <label className="form-label">
      {label} {!required && <span className="form-optional">(Optional)</span>}
    </label>
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="form-textarea"
      rows={rows}
      disabled={disabled}
      required={required}
    />
    {help && <small className="form-help">{help}</small>}
  </FormRow>
);

export const FormColorPicker: React.FC<FormColorPickerProps> = ({
  colors,
  selectedColor,
  onColorSelect,
  disabled = false
}) => (
  <div className="color-picker">
    {colors.map(color => (
      <button
        key={color}
        type="button"
        className={`color-option ${selectedColor === color ? 'selected' : ''}`}
        style={{ backgroundColor: color }}
        onClick={() => onColorSelect(color)}
        disabled={disabled}
      />
    ))}
  </div>
);

const Form: React.FC<FormProps> = ({ onSubmit, children, className = '', actions }) => (
  <form onSubmit={onSubmit} className={`create-bot-form ${className}`}>
    {children}
    {actions && (
      <div className="form-actions">
        {actions.cancel && (
          <Button type="button" variant="secondary" onClick={actions.cancel.onClick}>
            {actions.cancel.label}
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={actions.submit.disabled}
        >
          {actions.submit.label}
        </Button>
      </div>
    )}
  </form>
);

export default Form;