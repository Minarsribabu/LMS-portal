import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosService from '../services/axiosService';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/Dashboard.css';

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [createAdminForm, setCreateAdminForm] = useState({ name: '', email: '', password: '' });
  const [createCourseForm, setCreateCourseForm] = useState({ title: '', sessions: '', level: 'Beginner' });
  const [enrollForm, setEnrollForm] = useState({ courseId: '', userId: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const userOptions = useMemo(() => users.filter((item) => item.role === 'user'), [users]);
  const pendingRequestsByCourse = useMemo(
    () => courses
      .map((course) => ({
        ...course,
        pendingRequests: (course.enrollmentRequests || []).filter((request) => request.status === 'pending'),
      }))
      .filter((course) => course.pendingRequests.length > 0),
    [courses]
  );

  useEffect(() => {
    if (!message && !error) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setMessage('');
      setError('');
    }, 3500);

    return () => clearTimeout(timeoutId);
  }, [message, error]);

  const refreshProfile = async () => {
    const response = await axiosService.get('/user/profile');
    setUser(response.data);
    localStorage.setItem('user', JSON.stringify(response.data));
  };

  const refreshStats = async () => {
    const response = await axiosService.get('/admin/stats');
    setStats(response.data);
  };

  const refreshUsers = async () => {
    const response = await axiosService.get('/admin/users');
    setUsers(response.data);
  };

  const refreshCourses = async () => {
    const response = await axiosService.get('/admin/courses');
    setCourses(response.data);
  };

  const loadDashboard = async () => {
    try {
      await Promise.all([refreshProfile(), refreshStats(), refreshUsers(), refreshCourses()]);
    } catch (err) {
      setError('Failed to load admin dashboard');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (storedUser.role !== 'admin') {
      navigate('/unauthorized');
      return;
    }

    loadDashboard();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'overview') {
      refreshStats().catch(() => setError('Failed to refresh statistics'));
    }
    if (activeTab === 'users') {
      Promise.all([refreshUsers(), refreshCourses()]).catch(() => setError('Failed to refresh users section'));
    }
    if (activeTab === 'courses') {
      refreshCourses().catch(() => setError('Failed to refresh courses'));
    }
  }, [activeTab]);

  const clearStatus = () => {
    setError('');
    setMessage('');
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    clearStatus();
    setActionLoading(true);

    try {
      await axiosService.post('/admin/courses', {
        title: createCourseForm.title,
        sessions: Number(createCourseForm.sessions),
        level: createCourseForm.level,
      });

      setMessage('Course created successfully');
      setCreateCourseForm({ title: '', sessions: '', level: 'Beginner' });
      await refreshCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    clearStatus();
    setActionLoading(true);

    try {
      await axiosService.post('/admin/create-admin', {
        name: createAdminForm.name,
        email: createAdminForm.email,
        password: createAdminForm.password,
      });

      setMessage('Admin created successfully');
      setCreateAdminForm({ name: '', email: '', password: '' });
      await Promise.all([refreshUsers(), refreshStats()]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnrollUser = async (e) => {
    e.preventDefault();
    clearStatus();
    setActionLoading(true);

    try {
      await axiosService.post(`/admin/courses/${enrollForm.courseId}/enroll`, {
        userId: enrollForm.userId,
      });

      setMessage('User enrolled into course successfully');
      setEnrollForm({ courseId: '', userId: '' });
      await refreshCourses();
      await refreshUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to enroll user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRequest = async (courseId, userId) => {
    clearStatus();
    setActionLoading(true);

    try {
      await axiosService.post(`/admin/courses/${courseId}/enroll`, { userId });
      setMessage('Enrollment request approved successfully');
      await Promise.all([refreshCourses(), refreshUsers(), refreshStats()]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve enrollment request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) {
      return;
    }

    clearStatus();
    setActionLoading(true);

    try {
      await axiosService.delete(`/admin/users/${userId}`);
      setMessage('User deleted successfully');
      await refreshUsers();
      await refreshStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Remove this course?')) {
      return;
    }

    clearStatus();
    setActionLoading(true);

    try {
      await axiosService.delete(`/admin/courses/${courseId}`);
      setMessage('Course removed successfully');
      await refreshCourses();
      await refreshStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (pageLoading || !user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-shell">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={user.role === 'admin'} />

      <div className="admin-main-area">
        <Header userName={user.name} role={user.role} onLogout={handleLogout} />

        <main className="admin-content-area">
          {message && <div className="success-message success-inline">✓ {message}</div>}
          {error && <div className="error-message error-inline">⚠ {error}</div>}

          {activeTab === 'overview' && stats && (
            <section className="stats-container">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-value">{stats.totalUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Admins</h3>
                <p className="stat-value">{stats.totalAdmins}</p>
              </div>
              <div className="stat-card">
                <h3>Regular Users</h3>
                <p className="stat-value">{stats.totalRegularUsers}</p>
              </div>
              <div className="stat-card">
                <h3>Courses</h3>
                <p className="stat-value">{courses.length}</p>
              </div>
            </section>
          )}

          {activeTab === 'users' && (
            <section className="section-stack">
              <article className="card">
                <div className="card-header">
                  <div>
                    <h2>User Management</h2>
                    <p className="section-note">View users, delete accounts, and manage enrollments.</p>
                  </div>
                </div>
                <div className="users-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userItem) => (
                        <tr key={userItem.id}>
                          <td>{userItem.name}</td>
                          <td>{userItem.email}</td>
                          <td>
                            <span className={`role-badge ${userItem.role}`}>
                              {userItem.role}
                            </span>
                          </td>
                          <td>{new Date(userItem.createdAt).toLocaleDateString()}</td>
                          <td className="actions">
                            {userItem.id !== user.id ? (
                              <button onClick={() => handleDeleteUser(userItem.id)} className="btn-delete" disabled={actionLoading}>
                                Delete
                              </button>
                            ) : (
                              <span className="admin-badge">Current Account</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="card">
                <div className="card-header">
                  <div>
                    <h2>Enroll Users</h2>
                    <p className="section-note">Assign a selected user to a selected course.</p>
                  </div>
                </div>
                <form onSubmit={handleEnrollUser} className="stack-form two-col-form">
                  <div className="form-group">
                    <label>Course</label>
                    <select
                      value={enrollForm.courseId}
                      onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
                      required
                    >
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>User</label>
                    <select
                      value={enrollForm.userId}
                      onChange={(e) => setEnrollForm({ ...enrollForm, userId: e.target.value })}
                      required
                    >
                      <option value="">Select a user</option>
                      {userOptions.map((userItem) => (
                        <option key={userItem.id} value={userItem.id}>
                          {userItem.name} ({userItem.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={actionLoading || !courses.length || !userOptions.length} className="btn-primary">
                    {actionLoading ? 'Enrolling...' : 'Enroll User'}
                  </button>
                </form>
              </article>
            </section>
          )}

          {activeTab === 'courses' && (
            <section className="section-stack">
              <article className="card">
                <div className="card-header">
                  <div>
                    <h2>Course Management</h2>
                    <p className="section-note">Add new courses and maintain the current catalog.</p>
                  </div>
                </div>
                <form onSubmit={handleCreateCourse} className="stack-form two-col-form">
                  <div className="form-group">
                    <label>Course Title</label>
                    <input
                      type="text"
                      value={createCourseForm.title}
                      onChange={(e) => setCreateCourseForm({ ...createCourseForm, title: e.target.value })}
                      placeholder="e.g. Kubernetes Fundamentals"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sessions</label>
                    <input
                      type="number"
                      min="1"
                      value={createCourseForm.sessions}
                      onChange={(e) => setCreateCourseForm({ ...createCourseForm, sessions: e.target.value })}
                      placeholder="12"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Level</label>
                    <select
                      value={createCourseForm.level}
                      onChange={(e) => setCreateCourseForm({ ...createCourseForm, level: e.target.value })}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  <button type="submit" disabled={actionLoading} className="btn-primary">
                    {actionLoading ? 'Saving...' : 'Add Course'}
                  </button>
                </form>
              </article>

              <div className="course-grid">
                {courses.map((course) => {
                  const pendingRequests = (course.enrollmentRequests || []).filter((request) => request.status === 'pending');

                  return (
                    <article className="course-card course-card-admin" key={course.id}>
                      <div className="course-card-top">
                        <div>
                          <h3>{course.title}</h3>
                          <p>{course.level}</p>
                        </div>
                        <div className="badge-stack">
                          <span className="badge">{course.sessions} sessions</span>
                          <span className="badge level-badge">{course.enrolledCount || 0} enrolled</span>
                        </div>
                      </div>
                      <div className="course-card-meta">
                        <span>{pendingRequests.length} pending requests</span>
                        <button type="button" className="btn-delete btn-delete-inline" onClick={() => handleDeleteCourse(course.id)} disabled={actionLoading}>
                          Remove
                        </button>
                      </div>

                      {pendingRequests.length ? (
                        <div className="course-request-list">
                          {pendingRequests.map((request) => (
                            <div key={request.user?.id || request.user?._id || request._id} className="course-request-item">
                              <div className="course-request-user">
                                <span>{request.user?.name || 'Unknown user'}</span>
                                <span>{request.user?.email || 'No email'}</span>
                              </div>
                              <button
                                type="button"
                                className="btn-primary btn-approve-request"
                                onClick={() => handleApproveRequest(course.id, request.user?.id || request.user?._id)}
                                disabled={actionLoading || !request.user}
                              >
                                {actionLoading ? 'Approving...' : 'Approve'}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="course-empty-state">No pending enrollment requests.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === 'requests' && (
            <section className="section-stack">
              <article className="card">
                <div className="card-header">
                  <div>
                    <h2>Enrollment Requests</h2>
                    <p className="section-note">Approve pending requests by course with one click.</p>
                  </div>
                </div>

                {pendingRequestsByCourse.length ? (
                  <div className="request-course-list">
                    {pendingRequestsByCourse.map((course) => (
                      <article key={course.id} className="request-course-card">
                        <div className="request-course-head">
                          <h3>{course.title}</h3>
                          <span className="badge">{course.pendingRequests.length} pending</span>
                        </div>
                        <div className="course-request-list">
                          {course.pendingRequests.map((request) => (
                            <div key={request.user?.id || request.user?._id || request._id} className="course-request-item">
                              <div className="course-request-user">
                                <span>{request.user?.name || 'Unknown user'}</span>
                                <span>{request.user?.email || 'No email'}</span>
                              </div>
                              <button
                                type="button"
                                className="btn-primary btn-approve-request"
                                onClick={() => handleApproveRequest(course.id, request.user?.id || request.user?._id)}
                                disabled={actionLoading || !request.user}
                              >
                                {actionLoading ? 'Approving...' : 'Approve'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">There are no requests to be accepted.</p>
                )}
              </article>
            </section>
          )}

          {activeTab === 'create-admin' && (
            <section className="card auth-card-surface admin-create-card">
              <div className="card-header">
                <div>
                  <h2>Create Admin</h2>
                  <p className="section-note">Add a new administrator with real name, email, and password.</p>
                </div>
              </div>
              <form onSubmit={handleCreateAdmin} className="stack-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={createAdminForm.name}
                    onChange={(e) => setCreateAdminForm({ ...createAdminForm, name: e.target.value })}
                    placeholder="Admin name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={createAdminForm.email}
                    onChange={(e) => setCreateAdminForm({ ...createAdminForm, email: e.target.value })}
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={createAdminForm.password}
                    onChange={(e) => setCreateAdminForm({ ...createAdminForm, password: e.target.value })}
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
                <button type="submit" disabled={actionLoading} className="btn-primary">
                  {actionLoading ? 'Creating...' : 'Create Admin'}
                </button>
              </form>
            </section>
          )}

        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
