/**
 * Profile settings page with edit mode support
 */

import { useProfileStore } from '../stores/profileStore';
import ProfileForm from './ProfileForm';

export function ProfilePage() {
  const { profile, isEditing, startEditing, cancelEditing, saveProfile } = useProfileStore();

  // When in edit mode, show the ProfileForm
  if (isEditing && profile) {
    return (
      <div className="page-container">
        <ProfileForm
          initialName={profile.name}
          initialBio={profile.bio || ''}
          onSubmit={saveProfile}
          onCancel={cancelEditing}
          isEditMode={true}
        />
      </div>
    );
  }

  // When not editing, show static profile display
  return (
    <div className="page-container">
      <h2>Profile Settings</h2>
      {profile && (
        <div className="profile-settings">
          <p><strong>Name:</strong> {profile.name}</p>
          {profile.bio && <p><strong>Bio:</strong> {profile.bio}</p>}
          <div className="profile-settings__actions">
            <button onClick={startEditing} className="button button--primary" aria-label="Edit your profile">
              Edit Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
