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
        <h1 data-testid="profile-name">Welcome, {profile.name}</h1>
      </div>

      {profile.bio && (
        <p className="profile-bio" data-testid="profile-bio">
          {profile.bio}
        </p>
      )}

      <button
        className="button button--secondary"
        onClick={onEdit}
        aria-label="Edit profile"
      >
        Edit Profile
      </button>
    </div>
  );
}

export default ProfileDisplay;
