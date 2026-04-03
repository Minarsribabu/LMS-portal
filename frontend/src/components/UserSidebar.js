import React from 'react';
import { Link, NavLink } from 'react-router-dom';

function UserSidebar() {
  const items = [
    { to: '/user-dashboard', label: 'Home', icon: '🏠', end: true },
    { to: '/user-dashboard/my-courses', label: 'My Courses', icon: '📚' },
    { to: '/user-dashboard/profile', label: 'Profile Update', icon: '👤' },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">🎓</span>
        <div>
          <h2>LMS Portal</h2>
          <p>User Space</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="User sections">
        <Link to="/" className="sidebar-item">
          <span className="sidebar-icon" aria-hidden="true">🏡</span>
          <span>Home</span>
        </Link>

        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default UserSidebar;