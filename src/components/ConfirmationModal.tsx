/**
 * Confirmation modal dialog component
 * Used for destructive actions like clearing all data
 * Falls back to conditional rendering when <dialog> API is unavailable (e.g., jsdom tests)
 */

import { useEffect, useRef, useState } from 'react';
import './ConfirmationModal.css';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const [isOpenState, setIsOpenState] = useState(isOpen);
  const supportsDialog = typeof HTMLDialogElement !== 'undefined' && 'showModal' in HTMLDialogElement.prototype;

  useEffect(() => {
    setIsOpenState(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (!supportsDialog) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen, supportsDialog]);

  useEffect(() => {
    if (isOpen) {
      // Focus cancel button for safety
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    onCancel();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  if (!isOpenState) return null;

  return (
    <dialog
      ref={dialogRef}
      className="confirmation-modal"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-description"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === dialogRef.current) {
          handleClose();
        }
      }}
    >
      <div className={`confirmation-modal__content ${danger ? 'confirmation-modal__content--danger' : ''}`}>
        <h2 id="confirmation-modal-title" className="confirmation-modal__title">
          {title}
        </h2>
        <p id="confirmation-modal-description" className="confirmation-modal__message">
          {message}
        </p>
        <div className="confirmation-modal__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={handleClose}
            ref={cancelBtnRef}
            aria-label={confirmText === 'Yes, Clear Everything' ? 'Cancel and keep your data' : 'Cancel action'}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`button ${danger ? 'button--danger' : 'button--primary'}`}
            onClick={handleConfirm}
            aria-label={danger ? `${confirmText} - this is a destructive action` : confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default ConfirmationModal;
