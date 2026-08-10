import { useEffect } from 'react';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="legal-overlay" onClick={onCancel} role="presentation">
      <div
        className="legal-modal confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="legal-modal-body">
          <p id="confirm-dialog-message">{message}</p>
          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-sm btn-outline" onClick={onCancel}>
              Zurück
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={onConfirm}>
              Verwerfen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
