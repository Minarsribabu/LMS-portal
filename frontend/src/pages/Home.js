import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import axiosService from '../services/axiosService';
import CourseDetailModal from '../components/CourseDetailModal';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function Home() {
  const isAuthenticated = !!localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [requestingCourseId, setRequestingCourseId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!message && !error) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [message, error]);

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      if (isAuthenticated && user?.role === 'user') {
        const response = await axiosService.get('/user/courses');
        setCourses(response.data);
      } else {
        const response = await axios.get(`${API_BASE}/courses`);
        const guestCourses = response.data.map((course) => ({ ...course, enrollmentStatus: 'none' }));
        setCourses(guestCourses);
      }
    } catch (loadError) {
      setCourses([]);
      setError('Failed to load courses');
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [isAuthenticated, user?.role]);

  const openCourseDetails = (course) => {
    setSelectedCourse(course);
  };

  const closeCourseDetails = () => {
    setSelectedCourse(null);
  };

  const handleRequestEnrollment = async (courseId) => {
    setRequestingCourseId(courseId);
    setError('');
    setMessage('');

    try {
      const response = await axiosService.post(`/user/courses/${courseId}/request-enrollment`);
      setMessage(response.data.message || 'Enrollment request submitted');
      await loadCourses();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to request enrollment');
    } finally {
      setRequestingCourseId('');
    }
  };

  const selectedCourseStatus = useMemo(() => {
    if (!selectedCourse) {
      return 'none';
    }

    const latest = courses.find((course) => course.id === selectedCourse.id);
    return latest?.enrollmentStatus || selectedCourse.enrollmentStatus || 'none';
  }, [courses, selectedCourse]);

  const statusMap = useMemo(
    () => ({
      none: { label: 'Not Enrolled', className: 'status-none' },
      pending: { label: 'Pending', className: 'status-pending' },
      approved: { label: 'Approved', className: 'status-approved' },
      rejected: { label: 'Rejected', className: 'status-rejected' },
    }),
    []
  );

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-glow" />
        <h1 className="hero-title">
          <span className="gradient-text">{isAuthenticated ? `Welcome, ${user.name || 'Learner'}` : 'Learn. Build. Grow.'}</span>
        </h1>
        <p className="hero-subtitle">
          Browse available courses, open details for each one, and request enrollment when you are ready.
        </p>
      </section>

      {message && <div className="success-message home-alert">Success: {message}</div>}
      {error && <div className="error-message home-alert">Error: {error}</div>}

      <section id="courses" className="section">
        <h2 className="section-title">Course Catalog</h2>
        {coursesLoading ? (
          <div className="card-grid">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="card course-card course-card-skeleton">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ))}
          </div>
        ) : (
          <div className="card-grid">
            {courses.map((course) => {
              const status = statusMap[course.enrollmentStatus || 'none'];

              const courseIcons = ['🐳', '🔁', '☁️', '📊', '🚀', '🛠️', '⚙️', '🔐'];
              const courseIcon = courseIcons[courses.indexOf(course) % courseIcons.length];

              return (
                <button
                  key={course.id}
                  type="button"
                  className="card course-card home-course-card course-card-button"
                  onClick={() => openCourseDetails(course)}
                >
                  <div className="card-icon" aria-label={`${course.title} icon`}>{courseIcon}</div>
                  <h3>{course.title}</h3>
                  <p>Tap to view full course details, level guidance, and enrollment action.</p>
                  <div className="course-meta">
                    <span className="badge">{course.sessions} Sessions</span>
                    <span className="badge badge-green">{course.level}</span>
                  </div>
                  <div className="course-status-row">
                    <span className={`status-badge ${status.className}`}>{status.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <CourseDetailModal
        course={selectedCourse}
        isOpen={!!selectedCourse}
        isAuthenticated={isAuthenticated}
        isUserRole={user?.role === 'user'}
        enrollmentStatus={selectedCourseStatus}
        requesting={requestingCourseId === selectedCourse?.id}
        onClose={closeCourseDetails}
        onRequestEnrollment={handleRequestEnrollment}
      />
    </div>
  );
}

export default Home;
