import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

/* ─── Landing Page ─── */
function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-glow" />
        <h1 className="hero-title">
          <span className="gradient-text">Learn. Build. Grow.</span>
        </h1>
        <p className="hero-subtitle">
          Your skill development platform — watch recorded sessions, track progress, and level up your engineering career.
        </p>
        <div className="hero-actions">
          <Link to="/predict" className="btn btn-primary">Try Skill Predictor</Link>
          <a href="#courses" className="btn btn-outline">Browse Courses</a>
        </div>
      </section>

      <section id="courses" className="section">
        <h2 className="section-title">Featured Courses</h2>
        <div className="card-grid">
          {['Docker & Containers', 'CI/CD Pipelines', 'Cloud Deployment', 'Monitoring & Observability'].map((course, i) => (
            <div key={i} className="card">
              <div className={`card-icon icon-${i}`}>📚</div>
              <h3>{course}</h3>
              <p>Master the fundamentals with hands-on recorded sessions and real-world projects.</p>
              <div className="card-footer">
                <span className="badge">12 Sessions</span>
                <span className="badge badge-green">Beginner</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section section-dark">
        <h2 className="section-title">Platform Stats</h2>
        <div className="stats-row">
          {[
            { value: '500+', label: 'Recorded Sessions' },
            { value: '2,000+', label: 'Students Enrolled' },
            { value: '50+', label: 'Skill Tracks' },
            { value: '95%', label: 'Completion Rate' },
          ].map((stat, i) => (
            <div key={i} className="stat-card">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── Skill Predictor Page (calls Backend → ML Service) ─── */
function Predict() {
  const [form, setForm] = useState({ hours_watched: '', quizzes_passed: '', assignments_done: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setResult(null);
    try {
      const payload = {
        hours_watched: parseFloat(form.hours_watched),
        quizzes_passed: parseInt(form.quizzes_passed),
        assignments_done: parseInt(form.assignments_done),
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
            <input type="number" step="0.5" min="0" placeholder="e.g. 12.5"
              value={form.hours_watched}
              onChange={e => setForm({ ...form, hours_watched: e.target.value })}
              required />
          </div>
          <div className="form-group">
            <label>Quizzes Passed</label>
            <input type="number" min="0" placeholder="e.g. 8"
              value={form.quizzes_passed}
              onChange={e => setForm({ ...form, quizzes_passed: e.target.value })}
              required />
          </div>
          <div className="form-group">
            <label>Assignments Completed</label>
            <input type="number" min="0" placeholder="e.g. 5"
              value={form.assignments_done}
              onChange={e => setForm({ ...form, assignments_done: e.target.value })}
              required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Predicting…' : '🔮 Predict Skill Level'}
          </button>
        </form>

        {error && <div className="result-card result-error">{error}</div>}

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

/* ─── Main App ─── */
function App() {
  return (
    <Router>
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          <span className="nav-logo">🎓</span> LMS Portal
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/predict">Skill Predictor</Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predict" element={<Predict />} />
      </Routes>
      <footer className="footer">
        <p>LMS Portal &copy; 2026 — DevOps Infrastructure Demo</p>
      </footer>
    </Router>
  );
}

export default App;
