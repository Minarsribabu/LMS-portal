import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosService from '../services/axiosService';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/Dashboard.css';

const detailConfig = {
  users: {
    title: 'All Users',
    columns: ['Name', 'Email', 'Role', 'Joined'],
  },
  'admin-users': {
    title: 'Admin Users',
    columns: ['Name', 'Email', 'Role', 'Joined'],
  },
  'regular-users': {
    title: 'Regular Users',
    columns: ['Name', 'Email', 'Role', 'Joined'],
  },
  courses: {
    title: 'All Courses',
    columns: ['Title', 'Level', 'Sessions', 'Topics', 'Enrolled'],
  },
};

function AdminDetailView() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  const config = detailConfig[type];

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (storedUser.role !== 'admin') {
      navigate('/unauthorized');
      return;
    }
    setUser(storedUser);
  }, [navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!config) {
        setError('Unknown details type');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (type === 'courses') {
          const response = await axiosService.get('/admin/courses');
          setRows(response.data);
        } else {
          const response = await axiosService.get('/admin/users');
          const allUsers = response.data;
          if (type === 'admin-users') {
            setRows(allUsers.filter((item) => item.role === 'admin'));
          } else if (type === 'regular-users') {
            setRows(allUsers.filter((item) => item.role === 'user'));
          } else {
            setRows(allUsers);
          }
        }
      } catch (err) {
        setError('Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, config]);

  const renderedRows = useMemo(() => {
    if (type === 'courses') {
      return rows.map((course) => (
        <tr key={course.id}>
          <td>{course.title}</td>
          <td>{course.level}</td>
          <td>{course.sessions}</td>
          <td>{(course.topics || []).length}</td>
          <td>{course.enrolledCount || 0}</td>
        </tr>
      ));
    }

    return rows.map((entry) => (
      <tr key={entry.id}>
        <td>{entry.name}</td>
        <td>{entry.email}</td>
        <td>
          <span className={`role-badge ${entry.role}`}>{entry.role}</span>
        </td>
        <td>{new Date(entry.createdAt).toLocaleDateString()}</td>
      </tr>
    ));
  }, [rows, type]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-shell">
      <Sidebar activeTab="overview" setActiveTab={() => {}} isAdmin />
      <div className="admin-main-area">
        <Header userName={user.name} role={user.role} onLogout={handleLogout} />

        <main className="admin-content-area">
          <section className="card">
            <div className="card-header">
              <div>
                <h2>{config?.title || 'Details'}</h2>
                <p className="section-note">Dynamic data fetched from admin APIs.</p>
              </div>
              <Link className="btn-secondary details-back-link" to="/admin-dashboard">
                Back to Overview
              </Link>
            </div>

            {loading && <div className="loading-inline">Loading details...</div>}
            {error && <div className="error-message">{error}</div>}

            {!loading && !error && (
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      {config.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{renderedRows}</tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default AdminDetailView;
