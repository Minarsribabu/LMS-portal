import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminDetailView from './pages/AdminDetailView';
import CourseDetailPage from './pages/CourseDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import ProfileDropdown from './components/ProfileDropdown';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

/* ─── Skill Predictor Page (calls Backend → ML Service) ─── */
function Predict() {
  const [form, setForm] = useState({ hours_watched: '', quizzes_passed: '', assignments_done: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputError, setInputError] = useState('');
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/health`)
      .then(res => setBackendHealth(res.data))
      .catch(() => setBackendHealth({ status: 'unreachable' }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInputError('');
    setResult(null);

    const hoursWatched = Number(form.hours_watched);
    const quizzesPassed = Number(form.quizzes_passed);
    const assignmentsDone = Number(form.assignments_done);

    if ([hoursWatched, quizzesPassed, assignmentsDone].some((value) => Number.isNaN(value) || value < 0)) {
      setInputError('Please enter valid non-negative numeric values.');
      setLoading(false);
      return;
    }

    if (hoursWatched > 300 || quizzesPassed > 200 || assignmentsDone > 200) {
      setInputError('One or more values are outside expected range.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        hours_watched: hoursWatched,
        quizzes_passed: Math.trunc(quizzesPassed),
        assignments_done: Math.trunc(assignmentsDone),
      };
      const res = await axios.post(`${API_BASE}/predict`, payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get prediction. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <section className="section">
        <h2 className="section-title">
          <span className="gradient-text">AI Skill Predictor</span>
        </h2>
        <p className="section-desc">
          Enter your learning metrics and our ML service will predict your skill level.
          <br />
          <small className="flow-text">
            Flow: React → <code>/api/predict</code> → Node.js Backend → <code>http://lms-ml:8000/ml/predict</code> → FastAPI ML Service
          </small>
        </p>

        {backendHealth && (
          <div className={`health-badge ${backendHealth.status === 'ok' ? 'health-ok' : 'health-err'}`}>
            Backend: {backendHealth.status === 'ok' ? '🟢 Connected' : '🔴 Unreachable'}
          </div>
        )}

        <form className="predict-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Hours Watched</label>
            <input type="number" step="0.5" min="0" placeholder="10-25 hours"
              value={form.hours_watched}
              onChange={e => setForm({ ...form, hours_watched: e.target.value })}
              required />
          </div>
          <div className="form-group">
            <label>Quizzes Passed</label>
            <input type="number" min="0" placeholder="5-20"
              value={form.quizzes_passed}
              onChange={e => setForm({ ...form, quizzes_passed: e.target.value })}
              required />
          </div>
          <div className="form-group">
            <label>Assignments Completed</label>
            <input type="number" min="0" placeholder="3-15"
              value={form.assignments_done}
              onChange={e => setForm({ ...form, assignments_done: e.target.value })}
              required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Predicting…' : '🔮 Predict Skill Level'}
          </button>
        </form>

        {error && <div className="result-card result-error">{error}</div>}
  {inputError && <div className="result-card result-error">{inputError}</div>}

        {result && (
          <div className="result-card result-success">
            <div className="result-level">{result.predicted_level}</div>
            <div className="result-score">Confidence Score: <strong>{(result.confidence * 100).toFixed(1)}%</strong></div>
            <div className="result-detail">
              Model: {result.model} | Source: {result.source}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Unauthorized Page ─── */
function Unauthorized() {
  return (
    <div className="page">
      <section className="section">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>403</h1>
          <h2>Unauthorized Access</h2>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            You don't have permission to access this resource.
          </p>
          <Link to="/" className="btn btn-primary">Go Home</Link>
        </div>
      </section>
    </div>
  );
}

/* ─── Main App ─── */
function AppShell() {
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const hideGlobalLayout = location.pathname.startsWith('/admin-dashboard') || location.pathname.startsWith('/user-dashboard');

  return (
    <>
      {!hideGlobalLayout && (
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <span className="nav-logo">🎓</span> LMS Portal
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          {isAuthenticated && user?.role === 'user' && <Link to="/predict">Skill Predictor</Link>}
          {!isAuthenticated && (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
          {isAuthenticated && <ProfileDropdown user={user} />}
        </div>
      </nav>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/predict"
          element={
            <ProtectedRoute requiredRole="user">
              <Predict />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/course/:id" element={<CourseDetailPage />} />
        <Route 
          path="/user-dashboard" 
          element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/user-dashboard/*"
          element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/admin-dashboard/details/:type"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDetailView />
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideGlobalLayout && (
      <footer className="footer">
        <p>Dakh Edu LMS Portal &copy; 2026</p>
      </footer>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;

