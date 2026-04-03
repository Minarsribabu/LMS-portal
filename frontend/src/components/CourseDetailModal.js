import React from 'react';

function CourseDetailModal({
  course,
  isOpen,
  isAuthenticated,
  isUserRole,
  enrollmentStatus,
  requesting,
  onClose,
  onRequestEnrollment,
}) {
  if (!isOpen || !course) {
    return null;
  }

  const normalizedStatus = enrollmentStatus || 'none';
  const isPending = normalizedStatus === 'pending';
  const isApproved = normalizedStatus === 'approved';
  const canRequest = isAuthenticated && isUserRole && normalizedStatus === 'none';
  const description =
    course.description ||
    'A guided learning track designed to combine clear concepts, practical demos, and hands-on tasks.';

  return (
    <div className="course-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="course-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="course-modal-close" onClick={onClose} aria-label="Close course details">
          x
        </button>

        <h3 className="course-modal-title">{course.title}</h3>
        <p className="course-modal-description">{description}</p>

        <div className="course-modal-meta">
          <span className="badge">{course.level}</span>
          <span className="badge">{course.sessions} Sessions</span>
          <span className="badge">{course.enrolledCount || 0} Enrolled</span>
        </div>

        <div className="course-modal-actions">
          {canRequest && (
            <button
              type="button"
              className="btn btn-primary btn-full"
              disabled={requesting}
              onClick={() => onRequestEnrollment(course.id)}
            >
              {requesting ? 'Requesting...' : 'Request Enrollment'}
            </button>
          )}

          {isPending && <p className="course-help-text">Wait, this is being processed by admin.</p>}

          {isApproved && (
            <a href="/user-dashboard" className="btn btn-outline btn-full">
              Go to Course
            </a>
          )}

          {!isAuthenticated && <p className="course-help-text">Login to request enrollment.</p>}
        </div>
      </div>
    </div>
  );
}

export default CourseDetailModal;
