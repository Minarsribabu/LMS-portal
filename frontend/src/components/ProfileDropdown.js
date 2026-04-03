import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function ProfileDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!wrapperRef.current || wrapperRef.current.contains(event.target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const dashboardPath = user?.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="profile-dropdown" ref={wrapperRef}>
      <button type="button" className="profile-trigger" onClick={() => setOpen((prev) => !prev)}>
        {user?.profilePicture ? (
          <img src={user.profilePicture} alt="Profile" className="profile-trigger-image" />
        ) : (
          <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
        )}
      </button>

      {open && (
        <div className="profile-menu">
          <Link to="/" onClick={() => setOpen(false)} className="profile-menu-item">Home</Link>
          <Link to={dashboardPath} onClick={() => setOpen(false)} className="profile-menu-item">Dashboard</Link>
          <button type="button" onClick={handleLogout} className="profile-menu-item danger">Logout</button>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;
