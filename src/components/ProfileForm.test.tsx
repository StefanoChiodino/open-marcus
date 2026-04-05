import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileForm from './ProfileForm';

describe('ProfileForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  it('renders the form with name and bio fields', () => {
    render(<ProfileForm {...defaultProps} />);

    expect(screen.getByText(/Tell Us About Yourself/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/About You/)).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', () => {
    render(<ProfileForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /Begin Journey/ });
    fireEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when name is whitespace only', () => {
    render(<ProfileForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const submitButton = screen.getByRole('button', { name: /Begin Journey/ });
    fireEvent.click(submitButton);

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with valid form data', () => {
    render(<ProfileForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Name/);
    const bioTextarea = screen.getByLabelText(/About You/);

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(bioTextarea, { target: { value: 'About me' } });

    const submitButton = screen.getByRole('button', { name: /Begin Journey/ });
    fireEvent.click(submitButton);

    expect(defaultProps.onSubmit).toHaveBeenCalledWith({
      name: 'Test User',
      bio: 'About me',
    });
  });

  it('populates fields with initial values', () => {
    render(
      <ProfileForm
        {...defaultProps}
        initialName="Existing User"
        initialBio="Existing bio"
        isEditMode
      />
    );

    expect(screen.getByDisplayValue('Existing User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing bio')).toBeInTheDocument();
  });

  it('shows edit mode title and button text', () => {
    render(<ProfileForm {...defaultProps} isEditMode />);

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ProfileForm {...defaultProps} onCancel={onCancel} isEditMode />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('clears validation error when user changes name input', () => {
    render(<ProfileForm {...defaultProps} />);

    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /Begin Journey/ });
    fireEvent.click(submitButton);
    expect(screen.getByText('Name is required')).toBeInTheDocument();

    // Change name input - should clear error
    const nameInput = screen.getByLabelText(/Name/);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('shows server error when provided', () => {
    render(<ProfileForm {...defaultProps} serverError="API error occurred" />);

    expect(screen.getByText('API error occurred')).toBeInTheDocument();
  });

  it('shows disabled submit button when submitting', () => {
    render(<ProfileForm {...defaultProps} isSubmitting />);

    const submitButton = screen.getByRole('button', { name: 'Creating...' });
    expect(submitButton).toBeDisabled();
  });

  it('disables cancel button when submitting', () => {
    const onCancel = vi.fn();
    render(
      <ProfileForm {...defaultProps} onCancel={onCancel} isSubmitting isEditMode />
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeDisabled();
  });

  it('shows loading text when submitting in edit mode', () => {
    render(<ProfileForm {...defaultProps} isSubmitting isEditMode />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows character count for bio', () => {
    render(<ProfileForm {...defaultProps} />);

    const bioTextarea = screen.getByLabelText(/About You/);
    fireEvent.change(bioTextarea, { target: { value: 'Hello' } });

    expect(screen.getByText('5/500')).toBeInTheDocument();
  });

  it('sets aria attributes for accessibility', () => {
    render(<ProfileForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Name/);
    expect(nameInput).toHaveAttribute('aria-required', 'true');
    expect(nameInput).toHaveAttribute('aria-invalid', 'false');
  });
});
