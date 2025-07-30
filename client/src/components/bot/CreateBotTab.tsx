import React from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Form, { FormRow, FormTextarea, FormColorPicker } from '../ui/Form';

interface CreateBotForm {
  name: string;
  description: string;
  exampleMessages: string;
  avatar: string;
  avatarType: 'initials' | 'uploaded';
}

interface CreateBotTabProps {
  form: CreateBotForm;
  onUpdateField: <K extends keyof CreateBotForm>(field: K, value: CreateBotForm[K]) => void;
  onUpdateFields: (updates: Partial<CreateBotForm>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
  avatarColors: string[];
}

const CreateBotTab: React.FC<CreateBotTabProps> = ({
  form,
  onUpdateField,
  onUpdateFields,
  onSubmit,
  onCancel,
  loading,
  avatarColors
}) => {
  return (
    <Form
      onSubmit={onSubmit}
      actions={{
        cancel: { label: 'Cancel', onClick: onCancel },
        submit: { 
          label: loading ? 'Creating...' : 'Create Bot', 
          disabled: loading || !form.name.trim() 
        }
      }}
    >
      <div className="form-section">
        <div className="form-section-title">🤖 Basic Information</div>
        
        <FormRow>
          <Input
            label="Bot Name"
            value={form.name}
            onChange={(e) => onUpdateField('name', e.target.value)}
            placeholder="Enter bot name..."
            maxLength={50}
            disabled={loading}
          />
        </FormRow>

        <FormTextarea
          label="Description"
          value={form.description}
          onChange={(e) => onUpdateField('description', e.target.value)}
          placeholder="Describe the character's appearance, background, and traits..."
          rows={4}
          disabled={loading}
        />

        <FormRow>
          <label className="form-label">Avatar</label>
          {form.avatarType === 'initials' ? (
            <FormColorPicker
              colors={avatarColors}
              selectedColor={form.avatar}
              onColorSelect={(avatar) => onUpdateField('avatar', avatar)}
              disabled={loading}
            />
          ) : (
            <div className="uploaded-avatar-preview">
              <img src={form.avatar} alt="Bot avatar" className="avatar-preview-img" />
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => onUpdateFields({ avatarType: 'initials', avatar: '#7289DA' })}
              >
                Use Initials Instead
              </Button>
            </div>
          )}
        </FormRow>

        <FormTextarea
          label="Example Messages"
          value={form.exampleMessages}
          onChange={(e) => onUpdateField('exampleMessages', e.target.value)}
          placeholder="Example conversation to help the AI understand the character's speaking style..."
          rows={3}
          disabled={loading}
          help="Optional conversation examples for the AI"
        />
      </div>
    </Form>
  );
};

export default CreateBotTab;