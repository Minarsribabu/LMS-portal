import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axiosService from '../services/axiosService';
import ProfileSection from '../components/ProfileSection';
import CourseCard from '../components/CourseCard';
import UserSidebar from '../components/UserSidebar';
import Header from '../components/Header';
import '../styles/Dashboard.css';

function UserHomeSection({ user, loading, predictInput, setPredictInput, handlePredict, prediction, predictError }) {
  return (
    <section className="section-stack">
      <article className="card">
        <div className="card-header">
          <div>
            <h2>Dashboard Home</h2>
            <p className="section-note">Welcome back. Use this space to track progress and run skill predictions.</p>
          </div>
        </div>
        <p className="section-note">
          Hello {user.name}, you are currently enrolled in {user.enrolledCourses?.length || 0} course(s).
        </p>
      </article>

      <article className="card predictor-card">
        <div className="card-header">
          <div>
            <h2>Skill Predictor</h2>
            <p className="section-note">Use your learning activity to predict the next skill level.</p>
          </div>
        </div>
        <form onSubmit={handlePredict} className="stack-form predictor-form">
          <div className="form-group">
            <label>Hours Watched</label>
            <input
              className="predict-input"
              type="number"
              step="0.1"
              min="0"
              placeholder="10-25 hours"
              value={predictInput.hours_watched}
              onChange={(e) => setPredictInput({ ...predictInput, hours_watched: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Quizzes Passed</label>
            <input
              className="predict-input"
              type="number"
              min="0"
              placeholder="5-20"
              value={predictInput.quizzes_passed}
              onChange={(e) => setPredictInput({ ...predictInput, quizzes_passed: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Assignments Done</label>
            <input
              className="predict-input"
              type="number"
              min="0"
              placeholder="3-15"
              value={predictInput.assignments_done}
              onChange={(e) => setPredictInput({ ...predictInput, assignments_done: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary btn-action">
            {loading ? 'Predicting...' : 'Get Prediction'}
          </button>
        </form>

        {predictError && <div className="error-message">{predictError}</div>}

        {prediction && (
          <div className="prediction-result">
            <h3>Prediction Result</h3>
            <div className="result-item">
              <span>Predicted Performance:</span>
              <strong>{prediction.performance_level}</strong>
            </div>
            {prediction.confidence && (
              <div className="result-item">
                <span>Confidence:</span>
                <strong>{(prediction.confidence * 100).toFixed(1)}%</strong>
              </div>
            )}
            {prediction.message && (
              <div className="result-item">
                <span>Message:</span>
                <strong>{prediction.message}</strong>
              </div>
            )}
          </div>
        )}
      </article>
    </section>
  );
}

function MyCoursesSection({ user, progressByCourse, onMarkTopicComplete, actionLoading }) {
  return (
    <section className="card enrolled-courses-card">
      <div className="card-header">
        <div>
          <h2>My Courses</h2>
          <p className="section-note">Courses assigned to your account by the admin.</p>
        </div>
      </div>
      {user.enrolledCourses?.length ? (
        <div className="course-grid user-course-grid">
          {user.enrolledCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progressData={progressByCourse[course.id]}
              onMarkTopicComplete={onMarkTopicComplete}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">No course enrollments yet. Ask an admin to assign a course.</p>
      )}
    </section>
  );
}

function ProfileUpdateSection({
  user,
  isEditing,
  editedName,
  editedEmail,
  editedProfilePicture,
  setEditedName,
  setEditedEmail,
  onProfilePictureChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onLogout,
  loading,
}) {
  return (
    <section className="user-summary-grid">
      <ProfileSection
        user={user}
        isEditing={isEditing}
        editedName={editedName}
        editedEmail={editedEmail}
        editedProfilePicture={editedProfilePicture}
        setEditedName={setEditedName}
        setEditedEmail={setEditedEmail}
        onProfilePictureChange={onProfilePictureChange}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        onSave={onSave}
        onLogout={onLogout}
        loading={loading}
      />
    </section>
  );
}

function UserDashboard() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedProfilePicture, setEditedProfilePicture] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [predictInput, setPredictInput] = useState({ hours_watched: '', quizzes_passed: '', assignments_done: '' });
  const [prediction, setPrediction] = useState(null);
  const [predictError, setPredictError] = useState('');
  const [progressByCourse, setProgressByCourse] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!message && !error) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setMessage('');
      setError('');
    }, 3200);

    return () => clearTimeout(timeoutId);
  }, [message, error]);

  const fetchProfile = async () => {
    try {
      const response = await axiosService.get('/user/profile');
      setUser(response.data);
      setEditedName(response.data.name);
      setEditedEmail(response.data.email);
      setEditedProfilePicture(response.data.profilePicture || response.data.profileImage || '');
    } catch (err) {
      setError('Failed to fetch profile');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.enrolledCourses?.length) {
        setProgressByCourse({});
        return;
      }

      const entries = await Promise.all(
        user.enrolledCourses.map(async (course) => {
          try {
            const response = await axiosService.get(`/user/progress/${course.id}`);
            return [course.id, response.data];
          } catch (err) {
            return [course.id, { completedTopicIds: [], progressPercentage: 0 }];
          }
        })
      );

      setProgressByCourse(Object.fromEntries(entries));
    };

    fetchProgress();
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axiosService.put('/user/profile', {
        name: editedName,
        email: editedEmail,
        profilePicture: editedProfilePicture,
        profileImage: editedProfilePicture,
      });
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setEditedName(updatedUser.name);
      setEditedEmail(updatedUser.email);
      setEditedProfilePicture(updatedUser.profilePicture || updatedUser.profileImage || '');
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditedProfilePicture(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPredictError('');
    setPrediction(null);

    const hoursWatched = Number(predictInput.hours_watched);
    const quizzesPassed = Number(predictInput.quizzes_passed);
    const assignmentsDone = Number(predictInput.assignments_done);

    if ([hoursWatched, quizzesPassed, assignmentsDone].some((value) => Number.isNaN(value) || value < 0)) {
      setPredictError('Please enter valid non-negative values for all predictor fields.');
      setLoading(false);
      return;
    }

    if (hoursWatched > 300 || quizzesPassed > 200 || assignmentsDone > 200) {
      setPredictError('Values look out of expected range. Please provide realistic learning metrics.');
      setLoading(false);
      return;
    }

    try {
      const response = await axiosService.post('/predict', {
        hours_watched: hoursWatched,
        quizzes_passed: Math.trunc(quizzesPassed),
        assignments_done: Math.trunc(assignmentsDone),
      });
      setPrediction(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to make prediction.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTopicComplete = async (courseId, topicId) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axiosService.post('/user/progress', { courseId, topicId, status: 'completed' });
      const response = await axiosService.get(`/user/progress/${courseId}`);
      setProgressByCourse((prev) => ({ ...prev, [courseId]: response.data }));
      setMessage('Topic marked as completed.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update progress.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (profileLoading || !user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-shell user-shell">
      <UserSidebar />
      <div className="admin-main-area">
        <Header userName={user.name} role={user.role} onLogout={handleLogout} />

        <main className="admin-content-area">
          {message && <div className="success-message success-inline">Success: {message}</div>}
          {error && <div className="error-message error-inline">Error: {error}</div>}

          <Routes>
            <Route
              index
              element={
                <UserHomeSection
                  user={user}
                  loading={loading}
                  predictInput={predictInput}
                  setPredictInput={setPredictInput}
                  handlePredict={handlePredict}
                  prediction={prediction}
                  predictError={predictError}
                />
              }
            />
            <Route
              path="my-courses"
              element={
                <MyCoursesSection
                  user={user}
                  progressByCourse={progressByCourse}
                  onMarkTopicComplete={handleMarkTopicComplete}
                  actionLoading={loading}
                />
              }
            />
            <Route
              path="profile"
              element={
                <ProfileUpdateSection
                  user={user}
                  isEditing={isEditing}
                  editedName={editedName}
                  editedEmail={editedEmail}
                  editedProfilePicture={editedProfilePicture}
                  setEditedName={setEditedName}
                  setEditedEmail={setEditedEmail}
                  onProfilePictureChange={handleProfilePictureChange}
                  onStartEdit={() => setIsEditing(true)}
                  onCancelEdit={() => setIsEditing(false)}
                  onSave={handleUpdateProfile}
                  onLogout={handleLogout}
                  loading={loading}
                />
              }
            />
            <Route path="*" element={<Navigate to="/user-dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default UserDashboard;
