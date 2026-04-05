import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import type { ProfileFormData, ValidationErrors } from '../shared/types';
import { validateProfile } from '../lib/validators';
import './ProfileForm.css';

interface ProfileFormProps {
  initialName?: string;
  initialBio?: string;
  onSubmit: (data: ProfileFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  serverError?: string | null;
  isEditMode?: boolean;
}

function ProfileForm({
  initialName = '',
  initialBio = '',
  onSubmit,
  onCancel,
  isSubmitting = false,
  serverError = null,
  isEditMode = false,
}: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Update form when initial values change
  useEffect(() => {
    setName(initialName);
    setBio(initialBio);
    setErrors({});
  }, [initialName, initialBio]);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Clear error when user changes input
    if (errors.name) {
      setErrors({});
    }
  };

  const handleBioChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const validation = validateProfile({ name, bio });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    onSubmit({ name, bio });
  };

  const handleCancel = () => {
    setName(initialName);
    setBio(initialBio);
    setErrors({});
    onCancel?.();
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <h2>{isEditMode ? 'Edit Profile' : 'Tell Us About Yourself'}</h2>

      {serverError && (
        <div className="form-error" role="alert" aria-live="polite">
          {serverError}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="profile-name" className="form-label">
          Name <span className="required-indicator" aria-hidden="true">*</span>
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          className={`form-input ${errors.name ? 'invalid' : ''}`}
          placeholder="Your name"
          autoFocus
          maxLength={50}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" className="field-error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="profile-bio" className="form-label">
          About You
        </label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={handleBioChange}
          className="form-input form-textarea"
          placeholder="A brief bio about yourself (optional)"
          maxLength={500}
          rows={4}
        />
        <span className="char-count">{bio.length}/500</span>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {isEditMode ? 'Cancel' : 'Skip for now'}
          </button>
        )}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting
            ? isEditMode
              ? 'Saving...'
              : 'Creating...'
            : isEditMode
              ? 'Save Changes'
              : 'Begin Journey'}
        </button>
      </div>
    </form>
  );
}

export default ProfileForm;
