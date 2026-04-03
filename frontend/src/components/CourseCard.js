import React from 'react';

function CourseCard({ course }) {
  const getCourseIcon = (title = '') => {
    const value = title.toLowerCase();
    if (value.includes('docker') || value.includes('container')) return '🐳';
    if (value.includes('ci/cd') || value.includes('pipeline') || value.includes('devops')) return '🔁';
    if (value.includes('cloud') || value.includes('aws') || value.includes('azure')) return '☁️';
    if (value.includes('monitor') || value.includes('grafana') || value.includes('prometheus')) return '📊';
    return '🚀';
  };

  const shortDescription = course.description
    ? course.description
    : 'Continue your learning path with practical, guided sessions.';

  return (
    <article className="course-card course-card-user">
      <div className="course-card-top">
        <div>
          <div className="course-mini-icon" aria-hidden="true">{getCourseIcon(course.title)}</div>
          <h3>{course.title}</h3>
          <p>{shortDescription}</p>
        </div>
        <div className="badge-stack">
          <span className="badge level-badge">{course.level}</span>
          <span className="badge">{course.sessions} sessions</span>
        </div>
      </div>
      <div className="course-card-meta">
        <span>Enrolled on {new Date(course.createdAt).toLocaleDateString()}</span>
      </div>
    </article>
  );
}

export default CourseCard;
