/**
 * Tests for ConfirmationModal component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationModal from './ConfirmationModal';

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: false,
    title: 'Confirm Action',
    message: 'Are you sure?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('does not render when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={true} />);
    // jsdom renders <dialog> but considers it hidden, so we need `includeHiddenElements`
    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmationModal {...defaultProps} isOpen={true} onCancel={onCancel} />
    );

    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmationModal {...defaultProps} isOpen={true} onConfirm={onConfirm} />
    );

    await user.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows custom confirm and cancel text', () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        isOpen={true}
        confirmText="Yes, Delete"
        cancelText="No, Go Back"
      />
    );
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
    expect(screen.getByText('No, Go Back')).toBeInTheDocument();
  });

  it('applies danger styling when danger is true', () => {
    render(
      <ConfirmationModal {...defaultProps} isOpen={true} danger={true} />
    );
    const content = screen.getByRole('dialog', { hidden: true }).querySelector('.confirmation-modal__content--danger');
    expect(content).toBeInTheDocument();
  });

  it('focuses cancel button by default', async () => {
    render(
      <ConfirmationModal {...defaultProps} isOpen={true} />
    );
    const cancelButton = screen.getByText('Cancel') as HTMLButtonElement;
    // Focus is set after setTimeout for dialog support
    await waitFor(() => expect(cancelButton).toHaveFocus());
  });

  it('has correct ARIA attributes', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={true} />);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirmation-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'confirmation-modal-description');
  });
});
