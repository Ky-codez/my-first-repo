import { X, SignIn } from '@phosphor-icons/react';

export default function LoginToEngageModal({ onClose, onLogin }) {
  return (
    <div className="signout-overlay" onClick={onClose}>
      <div className="signout-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="lteg-icon">
          <SignIn size={40} weight="fill" color="#993C1D" />
        </div>
        <p className="signout-title">Join to Review & Engage</p>
        <p className="signout-sub">
          View public profiles for free, but create an account to review wines, rate palates, and build your own collection.
        </p>
        <div className="signout-actions">
          <button className="signout-confirm" onClick={onLogin}>
            Create Account or Login
          </button>
          <button className="signout-cancel" onClick={onClose}>
            Continue Browsing
          </button>
        </div>
      </div>
    </div>
  );
}
