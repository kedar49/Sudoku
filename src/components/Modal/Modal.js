import React from 'react';

/**
 * Modal component for displaying game messages and actions
 * Extracted as a separate component to enable code splitting
 */
const Modal = ({ title, message, onClose, onNewGame }) => (
  <div className="modal">
    <div className="modal-content">
      <h2 className="modal-title">{title}</h2>
      <p>{message}</p>
      <button className="modal-button" onClick={onClose}>Close</button>
      <button className="modal-button" onClick={onNewGame}>New Game</button>
    </div>
  </div>
);

export default Modal;