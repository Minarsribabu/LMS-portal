import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosService from '../services/axiosService';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import '../styles/Dashboard.css';

const emptyTopic = { title: '', videoUrl: '', videoPath: '', transcript: '' };

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [createAdminForm, setCreateAdminForm] = useState({ name: '', email: '', password: '' });
  const [courseForm, setCourseForm] = useState({
    id: '',
    title: '',
    description: '',
    thumbnail: '',
    sessions: 1,
    level: 'Beginner',
    topics: [{ ...emptyTopic }],
  });
  const [enrollForm, setEnrollForm] = useState({ courseId: '', userId: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const monitoringToken = localStorage.getItem('token') || '';

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

  const overviewCards = useMemo(() => {
    const totalCourses = Number(stats?.totalCourses ?? courses.length ?? 0);

    return [
      { label: 'Total Users', value: stats?.totalUsers ?? 0, to: '/admin-dashboard/details/users' },
      { label: 'Admin Users', value: stats?.totalAdmins ?? 0, to: '/admin-dashboard/details/admin-users' },
      { label: 'Regular Users', value: stats?.totalRegularUsers ?? 0, to: '/admin-dashboard/details/regular-users' },
      { label: 'Total Courses', value: totalCourses, to: '/admin-dashboard/details/courses' },
    ];
  }, [stats, courses.length]);

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

  const resetCourseForm = () => {
    setCourseForm({
      id: '',
      title: '',
      description: '',
      thumbnail: '',
      sessions: 1,
      level: 'Beginner',
      topics: [{ ...emptyTopic }],
    });
  };

  const handleTopicChange = (index, key, value) => {
    setCourseForm((prev) => {
      const nextTopics = [...prev.topics];
      nextTopics[index] = { ...nextTopics[index], [key]: value };
      return { ...prev, topics: nextTopics };
    });
  };

  const handleAddTopic = () => {
    setCourseForm((prev) => ({ ...prev, topics: [...prev.topics, { ...emptyTopic }] }));
  };

  const handleRemoveTopic = (index) => {
    setCourseForm((prev) => {
      const nextTopics = prev.topics.filter((_, topicIndex) => topicIndex !== index);
      return { ...prev, topics: nextTopics.length ? nextTopics : [{ ...emptyTopic }] };
    });
  };

  const handleCreateOrUpdateCourse = async (e) => {
    e.preventDefault();
    clearStatus();
    setActionLoading(true);

    try {
      const payload = {
        title: courseForm.title,
        description: courseForm.description,
        thumbnail: courseForm.thumbnail,
        sessions: Number(courseForm.sessions) || 1,
        level: courseForm.level,
        topics: courseForm.topics
          .filter((topic) => topic.title.trim())
          .map((topic) => ({
            title: topic.title.trim(),
            videoUrl: topic.videoUrl.trim(),
            videoPath: topic.videoPath.trim(),
            transcript: topic.transcript.trim(),
          })),
      };

      if (courseForm.id) {
        await axiosService.put(`/admin/course/${courseForm.id}`, payload);
        setMessage('Course updated successfully');
      } else {
        await axiosService.post('/admin/course', payload);
        setMessage('Course created successfully');
      }

      resetCourseForm();
      await Promise.all([refreshCourses(), refreshStats()]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save course');
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
      await Promise.all([refreshCourses(), refreshUsers()]);
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
      await Promise.all([refreshUsers(), refreshStats()]);
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
      await axiosService.delete(`/admin/course/${courseId}`);
      setMessage('Course removed successfully');
      await Promise.all([refreshCourses(), refreshStats()]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove course');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCourse = (course) => {
    setActiveTab('courses');
    setCourseForm({
      id: course.id,
      title: course.title || '',
      description: course.description || '',
      thumbnail: course.thumbnail || '',
      sessions: course.sessions || 1,
      level: course.level || 'Beginner',
      topics: Array.isArray(course.topics) && course.topics.length
        ? course.topics.map((topic) => ({
            title: topic.title || '',
            videoUrl: topic.videoUrl || '',
            videoPath: topic.videoPath || '',
            transcript: topic.transcript || '',
          }))
        : [{ ...emptyTopic }],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
          {message && <div className="success-message success-inline">{message}</div>}
          {error && <div className="error-message error-inline">{error}</div>}

          <section className="admin-monitoring-bar" aria-label="Monitoring">
            <span className="monitoring-title">Monitoring</span>
            <a
              className="monitoring-link"
              href={`/api/admin/monitoring/grafana?token=${encodeURIComponent(monitoringToken)}`}
              target="_blank"
              rel="noreferrer"
            >
              Grafana
            </a>
            <a
              className="monitoring-link"
              href={`/api/admin/monitoring/prometheus?token=${encodeURIComponent(monitoringToken)}`}
              target="_blank"
              rel="noreferrer"
            >
              Prometheus
            </a>
          </section>

          {activeTab === 'overview' && stats && (
            <section className="stats-container">
              {overviewCards.map((card) => (
                <button
                  type="button"
                  key={card.label}
                  className="stat-card stat-card-clickable"
                  onClick={() => navigate(card.to)}
                >
                  <h3>{card.label}</h3>
                  <p className="stat-value">{card.value}</p>
                </button>
              ))}
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
                    <h2>{courseForm.id ? 'Edit Course' : 'Create Course'}</h2>
                    <p className="section-note">Manage title, media, and topics/modules for each course.</p>
                  </div>
                </div>
                <form onSubmit={handleCreateOrUpdateCourse} className="stack-form">
                  <div className="two-col-form">
                    <div className="form-group">
                      <label>Course Title</label>
                      <input
                        type="text"
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        placeholder="e.g. Kubernetes Fundamentals"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Thumbnail URL (Optional)</label>
                      <input
                        type="url"
                        value={courseForm.thumbnail}
                        onChange={(e) => setCourseForm({ ...courseForm, thumbnail: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Sessions</label>
                      <input
                        type="number"
                        min="1"
                        value={courseForm.sessions}
                        onChange={(e) => setCourseForm({ ...courseForm, sessions: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Level</label>
                      <select
                        value={courseForm.level}
                        onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      className="course-textarea"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                      placeholder="Course summary"
                      rows="3"
                    />
                  </div>

                  <div className="topic-section">
                    <div className="topic-section-head">
                      <h3>Topics / Modules</h3>
                      <button type="button" className="btn-secondary" onClick={handleAddTopic}>Add Topic</button>
                    </div>

                    {courseForm.topics.map((topic, index) => (
                      <div key={`topic-${index}`} className="topic-card">
                        <div className="topic-card-head">
                          <strong>Topic {index + 1}</strong>
                          <button type="button" className="btn-delete btn-delete-inline" onClick={() => handleRemoveTopic(index)}>
                            Remove
                          </button>
                        </div>
                        <div className="two-col-form">
                          <div className="form-group">
                            <label>Topic Title</label>
                            <input
                              type="text"
                              value={topic.title}
                              onChange={(e) => handleTopicChange(index, 'title', e.target.value)}
                              placeholder="Topic name"
                              required={index === 0}
                            />
                          </div>
                          <div className="form-group">
                            <label>Video URL</label>
                            <input
                              type="url"
                              value={topic.videoUrl}
                              onChange={(e) => handleTopicChange(index, 'videoUrl', e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                          <div className="form-group">
                            <label>Video File Path</label>
                            <input
                              type="text"
                              value={topic.videoPath}
                              onChange={(e) => handleTopicChange(index, 'videoPath', e.target.value)}
                              placeholder="/uploads/video.mp4"
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Transcript</label>
                          <textarea
                            className="course-textarea"
                            value={topic.transcript}
                            onChange={(e) => handleTopicChange(index, 'transcript', e.target.value)}
                            rows="3"
                            placeholder="Topic transcript"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="form-actions-inline">
                    <button type="submit" disabled={actionLoading} className="btn-primary">
                      {actionLoading ? 'Saving...' : courseForm.id ? 'Update Course' : 'Create Course'}
                    </button>
                    {courseForm.id && (
                      <button type="button" className="btn-secondary" onClick={resetCourseForm}>
                        Cancel Edit
                      </button>
                    )}
                  </div>
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
                          <p>{course.description || course.level}</p>
                        </div>
                        <div className="badge-stack">
                          <span className="badge">{course.sessions} sessions</span>
                          <span className="badge level-badge">{course.enrolledCount || 0} enrolled</span>
                          <span className="badge">{(course.topics || []).length} topics</span>
                        </div>
                      </div>
                      <div className="course-card-meta">
                        <span>{pendingRequests.length} pending requests</span>
                        <div className="course-inline-actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => handleEditCourse(course)}
                            disabled={actionLoading}
                          >
                            Edit
                          </button>
                          <button type="button" className="btn-delete btn-delete-inline" onClick={() => handleDeleteCourse(course.id)} disabled={actionLoading}>
                            Remove
                          </button>
                        </div>
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
