import React from 'react';
import { Link } from 'react-router-dom';

function Sidebar({ activeTab, setActiveTab, isAdmin }) {
  const adminItems = [
    { key: 'home', label: 'Home', icon: '🏠', isHome: true },
    { key: 'overview', label: 'Overview', icon: '▦' },
    { key: 'users', label: 'Users', icon: '👥' },
    { key: 'courses', label: 'Courses', icon: '📚' },
    { key: 'requests', label: 'Requests', icon: '✅' },
    { key: 'create-admin', label: 'Create Admin', icon: '🛡' },
  ];

  const visibleItems = isAdmin ? adminItems : [];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo">🎓</span>
        <div>
          <h2>LMS Portal</h2>
          <p>Admin Console</p>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Admin sections">
        {visibleItems.map((item) => {
          if (item.isHome) {
            return (
              <Link
                key={item.key}
                to="/"
                className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
              >
                <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          }
          return (
            <button
              type="button"
              key={item.key}
              className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
