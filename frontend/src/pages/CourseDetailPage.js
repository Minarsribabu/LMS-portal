import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosService from '../services/axiosService';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const isVideoEmbedUrl = (url = '') => /youtube\.com|youtu\.be|vimeo\.com/i.test(url);

const buildEmbedUrl = (url = '') => {
  if (!url) {
    return '';
  }

  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  if (url.includes('watch?v=')) {
    const parsed = new URL(url);
    const videoId = parsed.searchParams.get('v');
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  if (url.includes('vimeo.com/')) {
    const parts = url.split('/');
    const videoId = parts[parts.length - 1].split(/[?&]/)[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }

  return url;
};

function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [course, setCourse] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState('none');
  const [loading, setLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openTopicIndex, setOpenTopicIndex] = useState(0);

  useEffect(() => {
    const loadCourse = async () => {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const response = await axios.get(`${API_BASE}/courses/${id}`);
        setCourse(response.data);

        if (isAuthenticated && user?.role === 'user') {
          try {
            const enrolledResponse = await axiosService.get('/user/courses');
            const matchedCourse = enrolledResponse.data.find((item) => item.id === id);
            setEnrollmentStatus(matchedCourse?.enrollmentStatus || 'none');
          } catch (statusError) {
            setEnrollmentStatus('none');
          }
        }
      } catch (loadError) {
        setError(loadError.response?.data?.error || 'Failed to load course');
        setCourse(null);
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id, isAuthenticated, user?.role]);

  useEffect(() => {
    if (!course?.topics?.length) {
      setOpenTopicIndex(-1);
      return;
    }

    setOpenTopicIndex((current) => (current >= 0 ? current : 0));
  }, [course]);

  const topics = useMemo(() => course?.topics || [], [course]);
  const canEnroll = isAuthenticated && user?.role === 'user' && enrollmentStatus === 'none';
  const alreadyEnrolled = enrollmentStatus === 'approved';

  const handleEnroll = async () => {
    if (!course || enrollmentLoading) {
      return;
    }

    setEnrollmentLoading(true);
    setError('');
    setSuccess('');

    try {
      await axiosService.post(`/user/courses/${course.id}/enroll`);
      setEnrollmentStatus('approved');
      setSuccess('Enrollment completed successfully.');
      navigate(`/course/${course.id}`, { replace: true });
    } catch (enrollError) {
      setError(enrollError.response?.data?.error || 'Enrollment failed');
    } finally {
      setEnrollmentLoading(false);
    }
  };

  return (
    <div className="page course-detail-page">
      <section className="section course-detail-shell">
        {loading ? (
          <div className="course-detail-loading">
            <div className="loading-spinner" />
            <p>Loading course...</p>
          </div>
        ) : error ? (
          <div className="card course-detail-card course-detail-error">
            <h1>Course Detail</h1>
            <p className="error-message">{error}</p>
            <Link to="/" className="btn btn-primary">Back to courses</Link>
          </div>
        ) : course ? (
          <article className="card course-detail-card">
            <div className="course-detail-header">
              <div>
                <p className="eyebrow">Course Detail</p>
                <h1>{course.title}</h1>
                <p className="course-detail-description">
                  {course.description || 'A guided learning path with practical demos, topic videos, and transcripts.'}
                </p>
              </div>
              <div className="course-detail-aside">
                <span className="badge">{course.level || 'Beginner'}</span>
                <span className="badge">{course.sessions || 0} Sessions</span>
                <span className="badge">{topics.length} Topics</span>
              </div>
            </div>

            <div className="course-detail-action-row">
              {canEnroll && (
                <button type="button" className="btn btn-primary" onClick={handleEnroll} disabled={enrollmentLoading}>
                  {enrollmentLoading ? 'Enrolling...' : 'Enroll'}
                </button>
              )}
              {alreadyEnrolled && <span className="enrollment-chip enrolled">Enrolled</span>}
              {enrollmentStatus === 'pending' && <span className="enrollment-chip pending">Pending approval</span>}
              {!isAuthenticated && <Link to="/login" className="btn btn-outline">Login to enroll</Link>}
            </div>

            {success && <div className="success-message course-detail-message">{success}</div>}
            {error && <div className="error-message course-detail-message">{error}</div>}

            <section className="course-topics-section">
              <div className="section-heading">
                <h2>Topics</h2>
                <p>Expand a topic to watch the video and review the transcript.</p>
              </div>

              {!topics.length ? (
                <div className="empty-state course-empty-state">No topics available</div>
              ) : (
                <div className="topic-accordion">
                  {topics.map((topic, index) => {
                    const isOpen = openTopicIndex === index;
                    const topicUrl = topic.videoUrl || topic.videoPath || '';
                    const embedUrl = buildEmbedUrl(topicUrl);

                    return (
                      <article key={topic.id || topic._id || `${topic.title}-${index}`} className={`topic-accordion-item ${isOpen ? 'open' : ''}`}>
                        <button
                          type="button"
                          className="topic-accordion-trigger"
                          aria-expanded={isOpen}
                          onClick={() => setOpenTopicIndex(isOpen ? -1 : index)}
                        >
                          <span>{topic.title}</span>
                          <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                        </button>

                        {isOpen && (
                          <div className="topic-accordion-panel">
                            <div className="topic-media">
                              {topicUrl ? (
                                isVideoEmbedUrl(topicUrl) ? (
                                  <iframe
                                    src={embedUrl}
                                    title={topic.title}
                                    className="topic-video-frame"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                ) : (
                                  <video className="topic-video-frame" controls>
                                    <source src={topicUrl} />
                                    Your browser does not support the video tag.
                                  </video>
                                )
                              ) : (
                                <div className="topic-video-placeholder">No video available for this topic.</div>
                              )}
                            </div>

                            <details className="transcript-details">
                              <summary>Transcript</summary>
                              <div className="transcript-content">
                                {topic.transcript ? topic.transcript : 'No transcript available.'}
                              </div>
                            </details>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </article>
        ) : null}
      </section>
    </div>
  );
}

export default CourseDetailPage;