import React from 'react';
import './CustomDialog.css';

function CustomDialog({ open, title, contentText, handleClose }) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">{title}</h3>
          <button className="dialog-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          <p className="dialog-text">{contentText}</p>
        </div>

        <div className="dialog-actions">
          <button onClick={handleClose} className="dialog-btn">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomDialog;