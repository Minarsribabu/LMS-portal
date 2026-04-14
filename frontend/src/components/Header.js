import React from 'react';
import { Link } from 'react-router-dom';

function Header({ userName, onLogout }) {
  return (
    <header className="admin-top-header">
      <Link to="/" className="admin-top-logo">
        <span aria-hidden="true">🎓</span>
        <span>LMS Portal</span>
      </Link>
      <div className="admin-top-actions">
        <Link to="/" className="admin-home-link">Home</Link>
        <span className="admin-user-greeting">👋 Hello, {userName || 'Admin'}</span>
        <button type="button" onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
