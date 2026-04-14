import React from 'react';

function CourseCard({ course, progressData, onMarkTopicComplete, actionLoading }) {
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

  const completedTopicIds = progressData?.completedTopicIds || [];
  const progressPercentage = progressData?.progressPercentage || 0;

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
        <span>{progressPercentage}% completed</span>
      </div>

      {!!course.topics?.length && (
        <div className="topic-list">
          {course.topics.map((topic) => {
            const isCompleted = completedTopicIds.includes(topic._id || topic.id);

            return (
              <div key={topic._id || topic.id} className={`topic-row ${isCompleted ? 'completed' : ''}`}>
                <div className="topic-meta">
                  <strong>{topic.title}</strong>
                  {topic.videoUrl && <span>{topic.videoUrl}</span>}
                </div>
                <button
                  type="button"
                  className="btn-primary btn-topic-complete"
                  disabled={isCompleted || actionLoading}
                  onClick={() => onMarkTopicComplete(course.id, topic._id || topic.id)}
                >
                  {isCompleted ? 'Completed' : 'Mark as Completed'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default CourseCard;
