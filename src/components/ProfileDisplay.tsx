import type { ProfileDTO } from '../shared/types';
import './ProfileDisplay.css';

interface ProfileDisplayProps {
  profile: ProfileDTO;
  onEdit: () => void;
}

function ProfileDisplay({ profile, onEdit }: ProfileDisplayProps) {
  return (
    <div className="profile-display" data-testid="profile-display">
      <div className="profile-header">
        <h2 data-testid="profile-name">Welcome, {profile.name}</h2>
      </div>

      {profile.bio && (
        <p className="profile-bio" data-testid="profile-bio">
          {profile.bio}
        </p>
      )}

      <button
        className="btn btn-secondary btn-edit-profile"
        onClick={onEdit}
        aria-label="Edit profile"
      >
        Edit Profile
      </button>
    </div>
  );
}

export default ProfileDisplay;
