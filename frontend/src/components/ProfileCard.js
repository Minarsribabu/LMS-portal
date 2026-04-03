import React from 'react';

function ProfileCard({ user, isEditing, editedName, editedEmail, editedProfilePicture, setEditedName, setEditedEmail, setEditedProfilePicture, onProfilePictureChange, onStartEdit, onCancelEdit, onSave, onLogout, loading }) {
  if (!user) {
    return null;
  }

  return (
    <article className="card profile-card">
      <div className="profile-hero compact">
        <div className="avatar-circle avatar-profile">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={`${user.name} profile`} className="profile-avatar-image" />
          ) : (
            user.name?.charAt(0)?.toUpperCase()
          )}
        </div>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="role-chip">{user.role}</span>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={onSave} className="stack-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={editedEmail}
              onChange={(e) => setEditedEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Profile Picture</label>
            <div className="profile-upload-control">
              <input
                type="file"
                accept="image/*"
                onChange={onProfilePictureChange}
              />
              <p className="upload-help-text">Upload a JPG, PNG, or WEBP image.</p>
            </div>
            {editedProfilePicture && (
              <div className="profile-upload-preview">
                <img src={editedProfilePicture} alt="Profile preview" />
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onCancelEdit} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="profile-summary-list">
            <div className="summary-item">
              <span>Joined</span>
              <strong>{new Date(user.createdAt).toLocaleDateString()}</strong>
            </div>
            <div className="summary-item">
              <span>Enrolled Courses</span>
              <strong>{user.enrolledCourses?.length || 0}</strong>
            </div>
          </div>
          <div className="profile-actions-row">
            <button onClick={onStartEdit} className="btn-edit wide" type="button">
              Edit Profile
            </button>
            <button onClick={onLogout} className="btn-logout-profile" type="button">
              Logout
            </button>
          </div>
        </>
      )}
    </article>
  );
}

export default ProfileCard;
