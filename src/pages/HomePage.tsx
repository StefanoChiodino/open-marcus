import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useSessionStore } from '../stores/sessionStore';
import ProfileDisplay from '../components/ProfileDisplay';
import './HomePage.css';

function HomePage() {
  const { profile } = useProfileStore();
  const navigate = useNavigate();

  const handleEdit = () => {
    useProfileStore.getState().startEditing();
  };

  const handleBeginMeditation = () => {
    // Start session before navigating so /session shows active chat, not another begin prompt
    useSessionStore.getState().beginSession(profile?.id);
    navigate('/session');
  };

  return (
    <div className="home-page">
      <main className="home-main">
        <div className="welcome-card">
          {profile && (
            <ProfileDisplay profile={profile} onEdit={handleEdit} />
          )}
          <h3>Welcome to OpenMarcus</h3>
          <p>
            Your personal Stoic companion, inspired by the wisdom of Marcus Aurelius.
            Begin your journey of self-reflection and philosophical exploration.
          </p>
          <button
            onClick={handleBeginMeditation}
            className="button button--primary button--lg home-page__begin-btn"
            aria-label="Begin meditation session"
          >
            Begin Meditation
          </button>
          <div className="disclaimer">
            <strong>Note:</strong> OpenMarcus is not therapy or medical advice.
            It is a reflection tool based on Stoic philosophy.
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
